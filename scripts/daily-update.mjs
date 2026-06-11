// ===================================================================
// 毎朝の自動更新スクリプト
// -------------------------------------------------------------------
// 1. accounts.json の各アカウントの「最新動画URL」を yt-dlp で取得
//    （メタデータのみ。動画ファイルは一切ダウンロードしない。
//      公開アカウントのみ・ログイン不要・リクエスト間に待機あり）
// 2. 結果を data/YYYY-MM-DD.json に保存（動画IDで重複排除）
// 3. 前回実行との差分（新規動画）を data/new.json にまとめる
// 4. 新規の最新動画をサイトへ自動登録（/api/videos/bulk）し、
//    最終確認日時を記録（/api/settings）→ サイトに NEW バッジ表示
// 5. data/report.html（朝のレポート）を再生成
//
// 使い方:  node scripts/daily-update.mjs
// 環境変数: SLEEP_MS(待機ms 既定8000) / PER_ACCOUNT(取得本数 既定3)
//           SYNC=0(サイト登録を止める) / SITE_BASE / ADMIN_SECRET
// 失敗してもクラッシュせず、そのアカウントをスキップしてログに残す。
// ===================================================================
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  ROOT, DATA_DIR, SITE_BASE,
  ensureDirs, loadEnvLocal, readJson, writeJson, sleep, todayStr, makeLogger,
  findYtDlp, isPlaceholderId,
} from "./_lib.mjs";

const execFileP = promisify(execFile);
const log = makeLogger();

const SLEEP_BASE = Math.max(1000, parseInt(process.env.SLEEP_MS || "8000", 10));
const SLEEP_JITTER = 5000; // +0〜5秒のランダム揺らぎ（機械的アクセスの緩和）
const PER_ACCOUNT = Math.min(10, Math.max(1, parseInt(process.env.PER_ACCOUNT || "3", 10)));
const SYNC = process.env.SYNC !== "0";
const env = loadEnvLocal();
const ADMIN_SECRET = process.env.ADMIN_SECRET || env.ADMIN_SECRET || "";

/** yt-dlp で1アカウントの最新動画メタデータを取得（動画DLなし） */
async function fetchLatest(ytdlp, account) {
  const url = account.url || `https://www.tiktok.com/@${account.handle}`;
  const args = [
    "--flat-playlist",          // 一覧のメタデータのみ（動画を一切落とさない）
    "--playlist-end", String(PER_ACCOUNT),
    "-J", "--no-warnings",
    "--socket-timeout", "20",
    "--retries", "2",
    url,
  ];
  const { stdout } = await execFileP(ytdlp, args, {
    timeout: 150000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  const j = JSON.parse(stdout);
  const videos = (j.entries || [])
    .filter((e) => e && e.id && !isPlaceholderId(String(e.id)))
    .map((e) => ({
      id: String(e.id),
      url: e.url || `https://www.tiktok.com/@${account.handle}/video/${e.id}`,
      title: (e.title || "").slice(0, 80),
    }));
  // プロフィール表示名（accounts.json の name が空なら自動補完に使う）
  const displayName = j.channel || j.uploader || null;
  return { videos, displayName };
}

/** 前回スナップショット（今日以外で最新の data/YYYY-MM-DD.json）を読む */
function loadPrevSnapshot() {
  const re = /^\d{4}-\d{2}-\d{2}\.json$/;
  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => re.test(f) && f !== `${todayStr()}.json`)
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const snap = readJson(path.join(DATA_DIR, files[0]), null);
  return snap ? { date: files[0].replace(".json", ""), snap } : null;
}

/** サイトAPIへ新規動画を登録（重複はサーバー側でもURL単位で排除される） */
async function syncToSite(urls) {
  const res = await fetch(`${SITE_BASE}/api/videos/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_SECRET },
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) throw new Error(`bulk HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function recordLastChecked() {
  const res = await fetch(`${SITE_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_SECRET },
    body: JSON.stringify({ lastCheckedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`settings HTTP ${res.status}`);
}

/** 朝のレポートHTMLを再生成 */
function writeReport(snapshot, newIds, syncResult) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rows = snapshot.accounts.map((a) => {
    const latest = a.videos[0];
    const isNew = latest && newIds.has(latest.id);
    const status = a.status === "ok"
      ? '<span style="color:#7CFC9A">OK</span>'
      : `<span style="color:#ff8aa8" title="${esc(a.error)}">スキップ</span>`;
    return `<tr>
      <td>${esc(a.shop) || "–"}</td>
      <td>${esc(a.name) || "–"}</td>
      <td><a href="https://www.tiktok.com/@${esc(a.handle)}" target="_blank">@${esc(a.handle)}</a></td>
      <td>${latest ? `<a href="${esc(latest.url)}" target="_blank">最新動画</a>${isNew ? ' <span class="new">NEW</span>' : ""}` : "–"}</td>
      <td>${status}</td>
    </tr>`;
  }).join("\n");

  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>かぶきコンカフェ嬢TikTokまとめ - 自動更新レポート ${esc(snapshot.date)}</title>
<style>
body{background:#0a0710;color:#eee;font-family:system-ui,sans-serif;margin:24px}
h1{font-size:18px} .sub{color:#999;font-size:12px;margin-bottom:16px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border-bottom:1px solid #2a2438;padding:8px 10px;text-align:left}
th{color:#c9a8ff} a{color:#7fc8ff;text-decoration:none}
.new{background:#ff3e85;color:#fff;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:bold}
.box{background:#161022;border:1px solid #2a2438;border-radius:10px;padding:12px 16px;margin:12px 0;font-size:13px}
</style></head><body>
<h1>📋 自動更新レポート <small>${esc(snapshot.date)}</small></h1>
<p class="sub">最終確認: ${esc(new Date(snapshot.generatedAt).toLocaleString("ja-JP"))} ／
アカウント ${snapshot.accounts.length}件（成功 ${snapshot.accounts.filter((a) => a.status === "ok").length}・スキップ ${snapshot.accounts.filter((a) => a.status !== "ok").length}）／
新規動画 ${newIds.size}件</p>
<div class="box">サイト登録: ${syncResult ? esc(syncResult) : "実行せず"} ／ <a href="${esc(SITE_BASE)}" target="_blank">サイトを開く</a></div>
<table><thead><tr><th>店舗</th><th>源氏名</th><th>アカウント</th><th>最新動画</th><th>状態</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
  fs.writeFileSync(path.join(DATA_DIR, "report.html"), html, "utf8");
}

async function main() {
  ensureDirs();
  const started = Date.now();
  log("===== 毎朝の自動更新 開始 =====");

  // アカウント読み込み
  const accountsFile = readJson(path.join(ROOT, "accounts.json"), null);
  const accounts = (accountsFile?.accounts || []).filter((a) => a.active !== false && a.handle);
  if (accounts.length === 0) {
    log("accounts.json にアカウントがありません。終了。");
    return;
  }

  // yt-dlp 確認（無ければ全件スキップ扱いでログに残して終了）
  const ytdlp = findYtDlp();
  if (!ytdlp) {
    log("エラー: yt-dlp が見つかりません。`winget install yt-dlp.yt-dlp` でインストールしてください。");
    process.exitCode = 1;
    return;
  }
  log(`yt-dlp: ${ytdlp} / 対象 ${accounts.length}アカウント / 1アカウント${PER_ACCOUNT}本 / 待機${SLEEP_BASE}ms+α`);

  // ---- 1. 各アカウントの最新動画を取得（失敗してもスキップして継続）----
  const seenIds = new Set(); // 動画IDで重複排除（スナップショット内）
  const resultAccounts = [];
  let nameUpdated = false;
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    try {
      const { videos, displayName } = await fetchLatest(ytdlp, a);
      const unique = videos.filter((v) => !seenIds.has(v.id));
      unique.forEach((v) => seenIds.add(v.id));
      resultAccounts.push({ handle: a.handle, name: a.name, shop: a.shop, status: "ok", videos: unique, checkedAt: new Date().toISOString() });
      log(`OK  @${a.handle}: ${unique.length}本（最新: ${unique[0]?.id || "なし"}）`);
      if (!a.name && displayName) { a.name = displayName; nameUpdated = true; } // 源氏名の自動補完
    } catch (e) {
      const msg = String(e.message || e).split("\n")[0].slice(0, 200);
      resultAccounts.push({ handle: a.handle, name: a.name, shop: a.shop, status: "error", videos: [], error: msg, checkedAt: new Date().toISOString() });
      log(`SKIP @${a.handle}: ${msg}`);
    }
    if (i < accounts.length - 1) await sleep(SLEEP_BASE + Math.floor(Math.random() * SLEEP_JITTER));
  }
  // 表示名を補完できたら accounts.json に書き戻す
  if (nameUpdated) {
    writeJson(path.join(ROOT, "accounts.json"), { ...accountsFile, updatedAt: new Date().toISOString(), accounts: accountsFile.accounts });
    log("accounts.json の空欄の源氏名を自動補完しました");
  }

  // ---- 2. スナップショット保存 ----
  const snapshot = { date: todayStr(), generatedAt: new Date().toISOString(), accounts: resultAccounts };
  writeJson(path.join(DATA_DIR, `${todayStr()}.json`), snapshot);

  // ---- 3. 前回との差分 → new.json ----
  const prev = loadPrevSnapshot();
  const prevIds = new Set(prev ? prev.snap.accounts.flatMap((a) => a.videos.map((v) => v.id)) : []);
  const newVideos = [];
  for (const a of resultAccounts) {
    for (const v of a.videos) {
      if (!prev || !prevIds.has(v.id)) newVideos.push({ ...v, handle: a.handle, name: a.name, shop: a.shop });
    }
  }
  const newIds = new Set(newVideos.map((v) => v.id));
  writeJson(path.join(DATA_DIR, "new.json"), {
    generatedAt: new Date().toISOString(),
    comparedWith: prev?.date || null,
    count: newVideos.length,
    videos: newVideos,
  });
  log(`新規動画: ${newVideos.length}件（前回: ${prev?.date || "なし(初回)"}）`);

  // ---- 4. サイトへ自動登録（各アカウントの最新1本のうち未登録のもの）----
  let syncSummary = null;
  const knownFile = path.join(DATA_DIR, "known-videos.json");
  const knownData = readJson(knownFile, { videos: [] });
  const knownIds = new Set(knownData.videos.map((v) => v.id));
  const toSync = resultAccounts
    .filter((a) => a.status === "ok" && a.videos[0] && !knownIds.has(a.videos[0].id))
    .map((a) => ({ id: a.videos[0].id, url: a.videos[0].url, handle: a.handle }));

  if (!SYNC) {
    log("SYNC=0 のためサイト登録はスキップ");
  } else if (!ADMIN_SECRET) {
    log("ADMIN_SECRET が無いためサイト登録はスキップ（.env.local を確認）");
  } else if (toSync.length === 0) {
    log("サイトに登録すべき新しい最新動画はありません");
    try { await recordLastChecked(); log("最終確認日時を記録しました"); } catch (e) { log(`最終確認日時の記録失敗: ${e.message}`); }
  } else {
    try {
      const r = await syncToSite(toSync.map((v) => v.url));
      syncSummary = `追加${r.added} / 重複${r.skippedDuplicate} / 無効${r.skippedInvalid}`;
      log(`サイト登録: ${syncSummary}`);
      for (const v of toSync) {
        knownData.videos.push({ ...v, source: "auto", addedAt: new Date().toISOString() });
      }
      writeJson(knownFile, { updatedAt: new Date().toISOString(), videos: knownData.videos });
      try { await recordLastChecked(); log("最終確認日時を記録しました"); } catch (e) { log(`最終確認日時の記録失敗: ${e.message}`); }
    } catch (e) {
      log(`サイト登録失敗（次回再試行されます）: ${e.message}`);
    }
  }

  // ---- 5. レポートHTML再生成 ----
  writeReport(snapshot, newIds, syncSummary);
  log(`レポート: data/report.html を再生成`);

  log(`===== 完了（${Math.round((Date.now() - started) / 1000)}秒） =====`);
}

main().catch((e) => {
  log(`致命的エラー: ${e.stack || e}`);
  process.exitCode = 1;
});
