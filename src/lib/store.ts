// ===================================================================
// クライアント側データ層（API 経由）
// localStorage 実装から、サーバー(PostgreSQL)を叩く API 呼び出しに変更。
// 管理操作は localStorage に保存した管理キーを x-admin-key で送る。
// ===================================================================

import type { DisplayWeight, PublishRequest, Video } from "./types";

const ADMIN_KEY_STORE = "kabuki.adminKey.v1";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_KEY_STORE) || "";
}
export function setAdminKey(k: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_KEY_STORE, k);
}
export function clearAdminKey() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ADMIN_KEY_STORE);
}

function adminHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "x-admin-key": getAdminKey() };
}

// ---- 動画（公開読み取り） --------------------------------------
export async function getVideos(): Promise<Video[]> {
  const res = await fetch("/api/videos", { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Video[];
}

// ---- 動画（管理） ----------------------------------------------
export type VideoFormInput = Omit<
  Video,
  "id" | "createdAt" | "updatedAt" | "viewCount" | "tiktokClickCount" | "shopClickCount"
> & { id?: string };

export async function saveVideo(input: VideoFormInput): Promise<Video | null> {
  const res = await fetch("/api/videos", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  return (await res.json()) as Video;
}

export async function patchVideo(
  id: string,
  patch: Partial<Pick<Video, "isActive" | "isPickup" | "isFixedTop">>
): Promise<boolean> {
  const res = await fetch("/api/videos", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ id, patch }),
  });
  return res.ok;
}

export async function deleteVideo(id: string): Promise<boolean> {
  const res = await fetch("/api/videos?id=" + encodeURIComponent(id), {
    method: "DELETE",
    headers: adminHeaders(),
  });
  return res.ok;
}

export async function addVideosBulk(urls: string[]): Promise<{
  added: number;
  skippedInvalid: number;
  skippedDuplicate: number;
}> {
  const res = await fetch("/api/videos/bulk", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) return { added: 0, skippedInvalid: 0, skippedDuplicate: 0 };
  return await res.json();
}

// ---- 計測（公開・撃ちっぱなし） --------------------------------
function track(id: string, field: "view" | "tiktok" | "shop") {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, field }),
    keepalive: true,
  }).catch(() => {});
}
export const trackView = (id: string) => track(id, "view");
export const trackTiktokClick = (id: string) => track(id, "tiktok");
export const trackShopClick = (id: string) => track(id, "shop");

// ---- 広告依頼 --------------------------------------------------
export async function getPublishRequests(): Promise<PublishRequest[]> {
  const res = await fetch("/api/requests", { headers: adminHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as PublishRequest[];
}

export async function addPublishRequest(
  input: Omit<PublishRequest, "id" | "createdAt" | "status">
): Promise<boolean> {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function setPublishRequestStatus(
  id: string,
  status: "new" | "done"
): Promise<boolean> {
  const res = await fetch("/api/requests", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ id, status }),
  });
  return res.ok;
}

// ---- 管理ログイン ---------------------------------------------
export async function adminLogin(key: string): Promise<boolean> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) return false;
  const j = await res.json();
  return !!j.ok;
}

export type { DisplayWeight };
