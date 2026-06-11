import { randomUUID } from "crypto";
import { query } from "./db";
import { isTikTokUrl } from "./tiktok";
import type { Ad, DisplayWeight, PublishRequest, Video } from "./types";

// ===================================================================
// サーバー側データアクセス（PostgreSQL）。API ルートからのみ呼ぶ。
// ===================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToVideo(r: any): Video {
  return {
    id: r.id,
    tiktokUrl: r.tiktok_url,
    tiktokViewUrl: r.tiktok_view_url,
    isActive: r.is_active,
    isPickup: r.is_pickup,
    badgeLabel: r.badge_label,
    showPrLabel: r.show_pr_label,
    shopName: r.shop_name ?? undefined,
    shopOfficialUrl: r.shop_official_url ?? undefined,
    displayWeight: r.display_weight as DisplayWeight,
    isFixedTop: r.is_fixed_top,
    fixedTopStartDate: r.fixed_top_start_date ? new Date(r.fixed_top_start_date).toISOString() : undefined,
    fixedTopEndDate: r.fixed_top_end_date ? new Date(r.fixed_top_end_date).toISOString() : undefined,
    viewCount: r.view_count,
    tiktokClickCount: r.tiktok_click_count,
    shopClickCount: r.shop_click_count,
    adminMemo: r.admin_memo ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToRequest(r: any): PublishRequest {
  return {
    id: r.id,
    tiktokUrl: r.tiktok_url,
    shopName: r.shop_name ?? "",
    shopOfficialUrl: r.shop_official_url ?? "",
    contact: r.contact ?? "",
    wantPickup: r.want_pickup,
    message: r.message ?? "",
    createdAt: new Date(r.created_at).toISOString(),
    status: r.status,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- 動画 -------------------------------------------------------
export async function listVideos(): Promise<Video[]> {
  const rows = await query<any>("SELECT * FROM videos ORDER BY seq DESC");
  return rows.map(rowToVideo);
}

type VideoInput = Omit<
  Video,
  "id" | "createdAt" | "updatedAt" | "viewCount" | "tiktokClickCount" | "shopClickCount"
> & { id?: string };

export async function upsertVideo(v: VideoInput): Promise<Video> {
  const id = v.id || "v_" + randomUUID().slice(0, 12);
  const rows = await query<any>(
    `INSERT INTO videos
       (id, tiktok_url, tiktok_view_url, is_active, is_pickup, badge_label, show_pr_label,
        shop_name, shop_official_url, display_weight, is_fixed_top, fixed_top_start_date, fixed_top_end_date, admin_memo, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
     ON CONFLICT (id) DO UPDATE SET
       tiktok_url=EXCLUDED.tiktok_url, tiktok_view_url=EXCLUDED.tiktok_view_url, is_active=EXCLUDED.is_active,
       is_pickup=EXCLUDED.is_pickup, badge_label=EXCLUDED.badge_label, show_pr_label=EXCLUDED.show_pr_label,
       shop_name=EXCLUDED.shop_name, shop_official_url=EXCLUDED.shop_official_url, display_weight=EXCLUDED.display_weight,
       is_fixed_top=EXCLUDED.is_fixed_top, fixed_top_start_date=EXCLUDED.fixed_top_start_date,
       fixed_top_end_date=EXCLUDED.fixed_top_end_date, admin_memo=EXCLUDED.admin_memo, updated_at=now()
     RETURNING *`,
    [
      id,
      v.tiktokUrl,
      v.tiktokViewUrl || v.tiktokUrl,
      v.isActive,
      v.isPickup,
      v.badgeLabel || "今注目",
      v.showPrLabel,
      v.shopName || null,
      v.shopOfficialUrl || null,
      v.displayWeight,
      v.isFixedTop,
      v.fixedTopStartDate || null,
      v.fixedTopEndDate || null,
      v.adminMemo || null,
    ]
  );
  return rowToVideo(rows[0]);
}

export async function patchVideo(
  id: string,
  patch: Partial<Pick<Video, "isActive" | "isPickup" | "isFixedTop">>
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.isActive !== undefined) { sets.push(`is_active=$${i++}`); vals.push(patch.isActive); }
  if (patch.isPickup !== undefined) { sets.push(`is_pickup=$${i++}`); vals.push(patch.isPickup); }
  if (patch.isFixedTop !== undefined) { sets.push(`is_fixed_top=$${i++}`); vals.push(patch.isFixedTop); }
  if (sets.length === 0) return;
  vals.push(id);
  await query(`UPDATE videos SET ${sets.join(", ")}, updated_at=now() WHERE id=$${i}`, vals);
}

export async function deleteVideo(id: string): Promise<void> {
  await query("DELETE FROM videos WHERE id=$1", [id]);
}

export async function bulkInsertVideos(urls: string[]): Promise<{
  added: number;
  skippedInvalid: number;
  skippedDuplicate: number;
}> {
  const existingRows = await query<{ tiktok_url: string }>("SELECT tiktok_url FROM videos");
  const existing = new Set(existingRows.map((r) => r.tiktok_url.trim()));
  const seen = new Set<string>();
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  let added = 0;

  for (const raw of urls) {
    const url = (raw || "").trim();
    if (!url) continue;
    if (!isTikTokUrl(url)) { skippedInvalid++; continue; }
    if (existing.has(url) || seen.has(url)) { skippedDuplicate++; continue; }
    seen.add(url);
    await query(
      `INSERT INTO videos (id, tiktok_url, tiktok_view_url) VALUES ($1,$2,$2)`,
      ["v_" + randomUUID().slice(0, 12), url]
    );
    added++;
  }
  return { added, skippedInvalid, skippedDuplicate };
}

const COUNTER_COLS: Record<string, string> = {
  view: "view_count",
  tiktok: "tiktok_click_count",
  shop: "shop_click_count",
};

export async function incrementCounter(id: string, field: string): Promise<void> {
  const col = COUNTER_COLS[field];
  if (!col) return;
  await query(`UPDATE videos SET ${col} = ${col} + 1 WHERE id=$1`, [id]);
}

// ---- 広告依頼 ---------------------------------------------------
export async function listPublishRequests(): Promise<PublishRequest[]> {
  const rows = await query<any>("SELECT * FROM publish_requests ORDER BY seq DESC");
  return rows.map(rowToRequest);
}

export async function addPublishRequest(
  input: Omit<PublishRequest, "id" | "createdAt" | "status">
): Promise<PublishRequest> {
  const rows = await query<any>(
    `INSERT INTO publish_requests (id, tiktok_url, shop_name, shop_official_url, contact, want_pickup, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      "r_" + randomUUID().slice(0, 12),
      input.tiktokUrl,
      input.shopName || null,
      input.shopOfficialUrl || null,
      input.contact,
      input.wantPickup,
      input.message || null,
    ]
  );
  return rowToRequest(rows[0]);
}

export async function setPublishRequestStatus(
  id: string,
  status: "new" | "done"
): Promise<void> {
  await query("UPDATE publish_requests SET status=$1 WHERE id=$2", [status, id]);
}

// ---- 画像バナー広告 --------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToAd(r: any): Ad {
  return {
    id: r.id,
    label: r.label ?? "",
    linkUrl: r.link_url,
    isActive: r.is_active,
    viewCount: r.view_count,
    clickCount: r.click_count,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAds(activeOnly: boolean): Promise<Ad[]> {
  const where = activeOnly ? "WHERE is_active = true" : "";
  const rows = await query(
    `SELECT id, label, link_url, is_active, view_count, click_count, created_at
     FROM ads ${where} ORDER BY seq DESC`
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(rowToAd);
}

export async function createAd(input: {
  label: string;
  linkUrl: string;
  imageData: string;
  imageMime: string;
}): Promise<Ad> {
  const rows = await query(
    `INSERT INTO ads (id, label, link_url, image_data, image_mime)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, label, link_url, is_active, view_count, click_count, created_at`,
    ["ad_" + randomUUID().slice(0, 12), input.label || "", input.linkUrl, input.imageData, input.imageMime || "image/jpeg"]
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rowToAd((rows as any[])[0]);
}

export async function toggleAd(id: string, isActive: boolean): Promise<void> {
  await query("UPDATE ads SET is_active=$1 WHERE id=$2", [isActive, id]);
}

export async function deleteAd(id: string): Promise<void> {
  await query("DELETE FROM ads WHERE id=$1", [id]);
}

export async function getAdImage(id: string): Promise<{ data: string; mime: string } | null> {
  const rows = await query<{ image_data: string; image_mime: string }>(
    "SELECT image_data, image_mime FROM ads WHERE id=$1",
    [id]
  );
  if (rows.length === 0) return null;
  return { data: rows[0].image_data, mime: rows[0].image_mime };
}

export async function incrementAdCounter(id: string, field: string): Promise<void> {
  const col = field === "click" ? "click_count" : field === "view" ? "view_count" : null;
  if (!col) return;
  await query(`UPDATE ads SET ${col} = ${col} + 1 WHERE id=$1`, [id]);
}

// ---- 設定（広告の表示間隔など）---------------------------------
export async function getAdInterval(): Promise<number> {
  const rows = await query<{ value: string }>("SELECT value FROM settings WHERE key='ad_interval'");
  const n = rows.length ? parseInt(rows[0].value, 10) : 7;
  return Number.isFinite(n) ? n : 7;
}

export async function setAdInterval(n: number): Promise<void> {
  await query(
    `INSERT INTO settings (key, value) VALUES ('ad_interval', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(Math.max(0, Math.floor(n)))]
  );
}

// 最終確認日時（毎朝の自動更新スクリプトが実行完了時に記録する）
export async function getLastChecked(): Promise<string | null> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM settings WHERE key='last_checked_at'"
  );
  return rows.length ? rows[0].value : null;
}

export async function setLastChecked(iso: string): Promise<void> {
  if (Number.isNaN(Date.parse(iso))) throw new Error("invalid date");
  await query(
    `INSERT INTO settings (key, value) VALUES ('last_checked_at', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [new Date(iso).toISOString()]
  );
}
