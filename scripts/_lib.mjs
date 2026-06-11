// 自動更新スクリプト共通ヘルパー
// 注意: 動画ファイルは一切ダウンロードしない。メタデータ(URL/ID/タイトル)のみ扱う。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data");
export const LOG_DIR = path.join(DATA_DIR, "logs");

export const SITE_BASE = process.env.SITE_BASE || "https://kabuki-concafe-tiktok.onrender.com";

/** .env.local を読んで ADMIN_SECRET などを得る（依存パッケージなしの簡易パーサ） */
export function loadEnvLocal() {
  const out = {};
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* .env.local が無くても続行（環境変数から取る） */
  }
  return out;
}

export function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 今日の日付 YYYY-MM-DD（ローカル時刻） */
export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** ログ: コンソール + data/logs/YYYY-MM-DD.log に追記 */
export function makeLogger() {
  ensureDirs();
  const file = path.join(LOG_DIR, `${todayStr()}.log`);
  return (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try {
      fs.appendFileSync(file, line + "\n", "utf8");
    } catch {
      /* ログ書き込み失敗でも処理は続行 */
    }
  };
}

/** TikTok URL から videoId を抽出 */
export function extractVideoId(url) {
  const m = (url || "").match(/\/video\/(\d{6,25})/);
  return m ? m[1] : null;
}

/** TikTok URL から @handle を抽出 */
export function extractHandleFromUrl(url) {
  const m = (url || "").match(/tiktok\.com\/@([A-Za-z0-9_.\-]+)/);
  return m ? m[1] : null;
}

/** サンプル用の仮ID（実在しない動画）か */
export function isPlaceholderId(id) {
  return !id || /^70000000000000000\d{2}$/.test(id);
}

/**
 * TikTok 公式 oEmbed で短縮URL等を解決（メタデータのみ・ログイン不要）。
 * 戻り: { videoId, handle, authorName } または null
 */
export async function resolveViaOEmbed(url) {
  const res = await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(url), {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return null;
  const j = await res.json();
  const handle = extractHandleFromUrl(j.author_url || "") ||
    (j.author_unique_id ? String(j.author_unique_id) : null);
  let videoId = j.embed_product_id ? String(j.embed_product_id) : null;
  if (!videoId && j.html) {
    const m = String(j.html).match(/\/video\/(\d{6,25})|data-video-id="(\d{6,25})"/);
    videoId = m ? m[1] || m[2] : null;
  }
  if (!videoId && !handle) return null;
  return { videoId, handle, authorName: j.author_name || null };
}

/** yt-dlp 実行ファイルを探す（PATH → winget の標準インストール先） */
export function findYtDlp() {
  const local = process.env.LOCALAPPDATA || "";
  const candidates = [
    "yt-dlp",
    path.join(local, "Microsoft", "WinGet", "Links", "yt-dlp.exe"),
    path.join(
      local,
      "Microsoft", "WinGet", "Packages",
      "yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "yt-dlp.exe"
    ),
  ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["--version"], { encoding: "utf8", timeout: 20000 });
      if (r.status === 0) return c;
    } catch {
      /* 次の候補へ */
    }
  }
  return null;
}
