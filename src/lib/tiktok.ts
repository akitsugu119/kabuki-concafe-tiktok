// ===================================================================
// TikTok URL ユーティリティ（STEP 5）
// -------------------------------------------------------------------
// ・動画ファイルは自サイトに保存しない。公式埋め込み iframe を使う。
// ・URL から数値の videoId を取り出して埋め込みURLを作る。
// ・サンプル用の仮IDは「実在しないID」として扱い、画面側でデモ表示にする。
// ===================================================================

/** TikTok URL から数値の videoId を取り出す。取れなければ null。 */
export function extractTikTokId(url: string): string | null {
  if (!url) return null;
  // 例: https://www.tiktok.com/@user/video/7212345678901234567
  const m = url.match(/\/video\/(\d{6,25})/);
  if (m) return m[1];
  // 例: https://www.tiktok.com/embed/v2/7212345678901234567
  const e = url.match(/\/embed\/(?:v2\/)?(\d{6,25})/);
  if (e) return e[1];
  return null;
}

/** 公式埋め込み iframe の URL（旧・blockquote型） */
export function tiktokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

/**
 * 公式プレーヤーAPIのURL（player/v1）。
 * postMessage で play/pause/mute/unMute を制御でき、終了イベントも取れる。
 * autoplay=1&muted=1 でミュート自動再生（ブラウザは音アリ自動再生を禁止のため）。
 */
export function tiktokPlayerUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    // muted=0：音アリ。最初の1タップ後はブラウザが音アリ自動再生を許可する
    muted: "0",
    controls: "1",
    progress_bar: "0",
    timestamp: "0",
    fullscreen_button: "0",
    music_info: "0",
    description: "0",
    rel: "0",
  });
  return `https://www.tiktok.com/player/v1/${videoId}?${params.toString()}`;
}

/**
 * サンプルデータの仮ID（7000000000000000001 のような連番）かどうか。
 * 仮IDは本物の動画が存在しないので、画面側では「デモカード」を表示する。
 */
export function isPlaceholderId(videoId: string | null): boolean {
  if (!videoId) return true;
  return /^70000000000000000\d{2}$/.test(videoId);
}

/** URL からアカウント名（@handle）をゆるく取り出す（デモ表示の見栄え用） */
export function extractHandle(url: string): string | null {
  const m = url.match(/@([A-Za-z0-9_.]+)/);
  return m ? m[1] : null;
}

/** TikTok のURLらしいか（通常URL・短縮URLどちらも対象） */
export function isTikTokUrl(url: string): boolean {
  return /^https?:\/\/([a-z0-9.-]+\.)?tiktok\.com\//i.test((url || "").trim());
}

/** 短縮URL（vt.tiktok.com/... や /t/...）かどうか。数値IDを含まないものを対象にする */
export function isShortLink(url: string): boolean {
  if (!url) return false;
  if (extractTikTokId(url)) return false; // すでにIDが取れる＝短縮ではない
  return /tiktok\.com/i.test(url);
}

export interface ResolvedTikTok {
  videoId: string;
  authorName: string | null;
  thumbnailUrl: string | null;
  title: string | null;
}

// 解決結果のキャッシュ（再マウント・再描画での再取得を防ぐ）
const resolveCache = new Map<string, Promise<ResolvedTikTok | null>>();

/** 短縮URLを /api/resolve 経由で解決して動画ID等を得る（クライアントから呼ぶ） */
export function resolveShortLink(url: string): Promise<ResolvedTikTok | null> {
  const cached = resolveCache.get(url);
  if (cached) return cached;

  const p = fetch("/api/resolve?url=" + encodeURIComponent(url))
    .then(async (r) => {
      if (!r.ok) return null;
      const j = (await r.json()) as Partial<ResolvedTikTok> & { error?: string };
      if (!j.videoId) return null;
      return {
        videoId: j.videoId,
        authorName: j.authorName ?? null,
        thumbnailUrl: j.thumbnailUrl ?? null,
        title: j.title ?? null,
      } as ResolvedTikTok;
    })
    .catch(() => null);

  resolveCache.set(url, p);
  return p;
}
