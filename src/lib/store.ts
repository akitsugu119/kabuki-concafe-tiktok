// ===================================================================
// データ層（localStorage 実装）
// -------------------------------------------------------------------
// 設定不要で動く MVP 用のストア。すべての読み書きをここに集約している
// ので、後で Supabase / Firebase に差し替える時はこのファイルの中身
// （関数の実装）だけ書き換えれば、画面側のコードは変えなくて済む。
// ===================================================================

import type { PublishRequest, TakedownRequest, Video } from "./types";
import { SAMPLE_VIDEOS } from "./sampleData";
import { isTikTokUrl } from "./tiktok";

const KEYS = {
  videos: "kabuki.videos.v2",
  publishRequests: "kabuki.publishRequests.v1",
  takedownRequests: "kabuki.takedownRequests.v1",
} as const;

const isBrowser = () => typeof window !== "undefined";

// ---- 低レベル read/write ----------------------------------------
function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}

// ---- 変更通知（React 側が購読して再描画する）--------------------
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- 初期化（初回アクセス時にサンプルを流し込む）----------------
export function ensureSeeded() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEYS.videos)) {
    window.localStorage.setItem(KEYS.videos, JSON.stringify(SAMPLE_VIDEOS));
  }
}

function uid() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ===================================================================
// 動画 CRUD
// ===================================================================
export function getVideos(): Video[] {
  ensureSeeded();
  return read<Video[]>(KEYS.videos, SAMPLE_VIDEOS);
}

export function getVideo(id: string): Video | undefined {
  return getVideos().find((v) => v.id === id);
}

export function saveVideo(
  input: Omit<Video, "id" | "createdAt" | "updatedAt" | "viewCount" | "tiktokClickCount" | "shopClickCount"> &
    Partial<Pick<Video, "id" | "viewCount" | "tiktokClickCount" | "shopClickCount">>
): Video {
  const videos = getVideos();
  const nowIso = new Date().toISOString();

  if (input.id) {
    const idx = videos.findIndex((v) => v.id === input.id);
    if (idx >= 0) {
      const updated: Video = {
        ...videos[idx],
        ...input,
        id: videos[idx].id,
        updatedAt: nowIso,
      } as Video;
      videos[idx] = updated;
      write(KEYS.videos, videos);
      return updated;
    }
  }

  const created: Video = {
    viewCount: 0,
    tiktokClickCount: 0,
    shopClickCount: 0,
    ...input,
    id: uid(),
    createdAt: nowIso,
    updatedAt: nowIso,
  } as Video;
  write(KEYS.videos, [created, ...videos]);
  return created;
}

/**
 * 複数URLをまとめて登録（管理画面の一括登録用）。
 * - 1件＝通常動画（表示ON・強度1）として作成。登録後に個別編集でピックアップ等を設定。
 * - TikTok以外のURL・空行・重複（既存／貼り付け内）はスキップ。
 * - 全件を1回の書き込みで保存（新しいものほど先頭）。
 */
export function addVideosBulk(urls: string[]): {
  added: number;
  skippedInvalid: number;
  skippedDuplicate: number;
} {
  const videos = getVideos();
  const existing = new Set(videos.map((v) => v.tiktokUrl.trim()));
  const seen = new Set<string>();
  const nowIso = new Date().toISOString();

  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  const created: Video[] = [];

  for (const raw of urls) {
    const url = (raw || "").trim();
    if (!url) continue;
    if (!isTikTokUrl(url)) {
      skippedInvalid++;
      continue;
    }
    if (existing.has(url) || seen.has(url)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(url);
    created.push({
      id: uid(),
      tiktokUrl: url,
      tiktokViewUrl: url,
      isActive: true,
      isPickup: false,
      badgeLabel: "今注目",
      showPrLabel: false,
      displayWeight: 1,
      isFixedTop: false,
      viewCount: 0,
      tiktokClickCount: 0,
      shopClickCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (created.length > 0) {
    write(KEYS.videos, [...created, ...videos]);
  }
  return { added: created.length, skippedInvalid, skippedDuplicate };
}

export function deleteVideo(id: string) {
  write(
    KEYS.videos,
    getVideos().filter((v) => v.id !== id)
  );
}

/** 表示ON/OFF・ピックアップ等のトグルをまとめて更新 */
export function patchVideo(id: string, patch: Partial<Video>) {
  const videos = getVideos();
  const idx = videos.findIndex((v) => v.id === id);
  if (idx < 0) return;
  videos[idx] = { ...videos[idx], ...patch, updatedAt: new Date().toISOString() };
  write(KEYS.videos, videos);
}

export function resetToSample() {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEYS.videos, JSON.stringify(SAMPLE_VIDEOS));
  emit();
}

// ===================================================================
// 計測（STEP 10）
// ===================================================================
export function trackView(id: string) {
  bump(id, "viewCount");
}
export function trackTiktokClick(id: string) {
  bump(id, "tiktokClickCount");
}
export function trackShopClick(id: string) {
  bump(id, "shopClickCount");
}

function bump(id: string, field: "viewCount" | "tiktokClickCount" | "shopClickCount") {
  const videos = getVideos();
  const idx = videos.findIndex((v) => v.id === id);
  if (idx < 0) return;
  videos[idx] = { ...videos[idx], [field]: (videos[idx][field] ?? 0) + 1 };
  // 計測は頻発するので emit するが、UI 更新を最小化するため write をそのまま使う
  write(KEYS.videos, videos);
}

// ===================================================================
// 掲載依頼（STEP 11）
// ===================================================================
export function getPublishRequests(): PublishRequest[] {
  return read<PublishRequest[]>(KEYS.publishRequests, []);
}

export function addPublishRequest(
  input: Omit<PublishRequest, "id" | "createdAt" | "status">
): PublishRequest {
  const created: PublishRequest = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  write(KEYS.publishRequests, [created, ...getPublishRequests()]);
  return created;
}

export function setPublishRequestStatus(id: string, status: PublishRequest["status"]) {
  write(
    KEYS.publishRequests,
    getPublishRequests().map((r) => (r.id === id ? { ...r, status } : r))
  );
}

// ===================================================================
// 掲載停止・修正依頼（STEP 12）
// ===================================================================
export function getTakedownRequests(): TakedownRequest[] {
  return read<TakedownRequest[]>(KEYS.takedownRequests, []);
}

export function addTakedownRequest(
  input: Omit<TakedownRequest, "id" | "createdAt" | "status">
): TakedownRequest {
  const created: TakedownRequest = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  write(KEYS.takedownRequests, [created, ...getTakedownRequests()]);
  return created;
}

export function setTakedownRequestStatus(id: string, status: TakedownRequest["status"]) {
  write(
    KEYS.takedownRequests,
    getTakedownRequests().map((r) => (r.id === id ? { ...r, status } : r))
  );
}
