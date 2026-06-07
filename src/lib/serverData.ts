import { randomUUID } from "crypto";
import { query } from "./db";
import { isTikTokUrl } from "./tiktok";
import type { DisplayWeight, PublishRequest, Video } from "./types";

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
