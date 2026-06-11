// ===================================================================
// 既存データ → accounts.json 移行スクリプト（1回だけ実行する）
// -------------------------------------------------------------------
// ・本番API /api/videos から現在の動画一覧を取得
// ・短縮URLは TikTok 公式 oEmbed で解決して @handle を特定
// ・店舗名/源氏名(表示名)/ハンドルを accounts.json にまとめる
// ・既存動画のIDを data/known-videos.json（同期済み台帳）に記録
//   → 毎朝の自動更新で同じ動画を二重登録しないため
// 使い方: node scripts/migrate-accounts.mjs
// ===================================================================
import path from "path";
import {
  ROOT, DATA_DIR, SITE_BASE,
  ensureDirs, readJson, writeJson, sleep, makeLogger,
  extractVideoId, extractHandleFromUrl, isPlaceholderId, resolveViaOEmbed,
} from "./_lib.mjs";

const log = makeLogger();

async function main() {
  ensureDirs();
  log(`移行開始: ${SITE_BASE}/api/videos から既存データを取得`);

  const res = await fetch(`${SITE_BASE}/api/videos`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`動画一覧の取得に失敗: HTTP ${res.status}`);
  const videos = await res.json();
  log(`既存動画: ${videos.length}件`);

  const accountsFile = path.join(ROOT, "accounts.json");
  const knownFile = path.join(DATA_DIR, "known-videos.json");
  const prevAccounts = readJson(accountsFile, { accounts: [] }).accounts || [];
  const known = readJson(knownFile, { videos: [] }).videos || [];
  const knownIds = new Set(known.map((v) => v.id));

  // handle → アカウント情報
  const byHandle = new Map();
  for (const a of prevAccounts) byHandle.set(a.handle, a); // 再実行時は既存を保持

  let resolved = 0, skipped = 0;
  for (const v of videos) {
    const url = (v.tiktokUrl || "").trim();
    let id = extractVideoId(url);
    let handle = extractHandleFromUrl(url);
    let authorName = null;

    if (id && isPlaceholderId(id)) { skipped++; continue; } // サンプル仮データ(偽ID)は対象外

    // 短縮URL等は oEmbed で解決（レート配慮で1.5秒待機）
    if (!id || !handle) {
      try {
        const r = await resolveViaOEmbed(url);
        await sleep(1500);
        if (r) {
          id = id || r.videoId;
          handle = handle || r.handle;
          authorName = r.authorName;
        }
      } catch (e) {
        log(`  解決失敗(スキップ): ${url} — ${e.message}`);
      }
    }
    if (id && isPlaceholderId(id)) { skipped++; continue; }
    if (!id && !handle) { log(`  解決不能(スキップ): ${url}`); skipped++; continue; }

    if (handle) {
      const cur = byHandle.get(handle) || {
        handle,
        name: "",          // 源氏名（表示名）。oEmbedの作者名を初期値に、あとで手で直せる
        shop: "",          // 店舗名。分かるものだけ自動で入れる
        url: `https://www.tiktok.com/@${handle}`,
        active: true,      // false にするとそのアカウントは取得対象外
      };
      if (!cur.name && authorName) cur.name = authorName;
      if (!cur.shop && v.shopName && !v.shopName.includes("サンプル")) cur.shop = v.shopName;
      byHandle.set(handle, cur);
    } else {
      log(`  ハンドル不明(アカウント登録なし・動画台帳のみ): ${url}`);
    }

    if (id && !knownIds.has(id)) {
      known.push({ id, url, handle: handle || null, source: "existing-db", addedAt: new Date().toISOString() });
      knownIds.add(id);
      resolved++;
    }
  }

  const accounts = Array.from(byHandle.values()).sort((a, b) => a.handle.localeCompare(b.handle));
  writeJson(accountsFile, {
    _comment: "店舗・源氏名・TikTokハンドルの一元管理。name/shop は自由に編集OK。active:false で取得停止",
    updatedAt: new Date().toISOString(),
    accounts,
  });
  writeJson(knownFile, { updatedAt: new Date().toISOString(), videos: known });

  log(`完了: アカウント ${accounts.length}件 → accounts.json / 既存動画台帳 ${known.length}件(今回追加${resolved}) → data/known-videos.json / スキップ ${skipped}件`);
}

main().catch((e) => {
  log(`致命的エラー: ${e.stack || e}`);
  process.exitCode = 1;
});
