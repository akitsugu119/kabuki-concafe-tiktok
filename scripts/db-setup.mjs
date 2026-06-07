// データベース初期化スクリプト（テーブル作成＋サンプル投入）
// 使い方: DB_URL="postgres://..." node scripts/db-setup.mjs
//   DB_URL 未指定なら %TEMP%/kabuki_db_ext.txt を読む
import pg from "pg";
import fs from "fs";
import path from "path";

const conn =
  process.env.DB_URL ||
  fs.readFileSync(path.join(process.env.TEMP || "/tmp", "kabuki_db_ext.txt"), "utf8").trim();

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

const URLS = [
  "https://vt.tiktok.com/ZSQJrLcPg/",
  "https://vt.tiktok.com/ZSQJrN9rw/",
  "https://vt.tiktok.com/ZSQJrMbmP/",
  "https://vt.tiktok.com/ZSQJrRpVL/",
  "https://vt.tiktok.com/ZSQJMEEos/",
  "https://vt.tiktok.com/ZSQJrcrAP/",
  "https://vt.tiktok.com/ZSQJrGBky/",
  "https://vt.tiktok.com/ZSQJrp4Tc/",
  "https://vt.tiktok.com/ZSxokMaay/",
  "https://vt.tiktok.com/ZSxohvFkC/",
  "https://vt.tiktok.com/ZSxok6odL/",
  "https://vt.tiktok.com/ZSxok8JsX/",
  "https://vt.tiktok.com/ZSxokYW3M/",
  "https://vt.tiktok.com/ZSxokYxj8/",
  "https://vt.tiktok.com/ZSxoke46x/",
  "https://vt.tiktok.com/ZSxokN4gf/",
  "https://vt.tiktok.com/ZSxoh7cBo/",
  "https://vt.tiktok.com/ZSxokYqaR/",
  "https://vt.tiktok.com/ZSxokLjXd/",
];
const EXTRAS = {
  0: { is_pickup: true, is_fixed_top: true, show_pr_label: true, shop_name: "（サンプル店舗）コンカフェ ねおん", shop_official_url: "https://example.com/neon", display_weight: 5, fixed_top_start_date: "2026-05-01", fixed_top_end_date: "2026-12-31", admin_memo: "固定トップ枠サンプル" },
  2: { is_pickup: true, show_pr_label: true, shop_name: "（サンプル店舗）メイドカフェ ほしぞら", shop_official_url: "https://example.com/hoshizora", display_weight: 5, admin_memo: "ピックアップ（強）" },
  5: { is_pickup: true, show_pr_label: true, shop_name: "（サンプル店舗）Cafe ゆめずく", shop_official_url: "https://example.com/yumezuku", display_weight: 3, admin_memo: "ピックアップ（中）" },
  9: { is_pickup: true, show_pr_label: false, shop_name: "（サンプル店舗）コンカフェ みるく", shop_official_url: "https://example.com/milk", display_weight: 2, admin_memo: "ピックアップ（弱）" },
};

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id text PRIMARY KEY,
      seq bigserial,
      tiktok_url text NOT NULL,
      tiktok_view_url text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      is_pickup boolean NOT NULL DEFAULT false,
      badge_label text NOT NULL DEFAULT '今注目',
      show_pr_label boolean NOT NULL DEFAULT false,
      shop_name text,
      shop_official_url text,
      display_weight int NOT NULL DEFAULT 1,
      is_fixed_top boolean NOT NULL DEFAULT false,
      fixed_top_start_date timestamptz,
      fixed_top_end_date timestamptz,
      view_count int NOT NULL DEFAULT 0,
      tiktok_click_count int NOT NULL DEFAULT 0,
      shop_click_count int NOT NULL DEFAULT 0,
      admin_memo text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS publish_requests (
      id text PRIMARY KEY,
      seq bigserial,
      tiktok_url text,
      shop_name text,
      shop_official_url text,
      contact text,
      want_pickup boolean DEFAULT false,
      message text,
      status text NOT NULL DEFAULT 'new',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await client.query("SELECT count(*)::int AS c FROM videos");
  if (rows[0].c > 0) {
    console.log("videos already has", rows[0].c, "rows. Skip seeding.");
  } else {
    for (let i = 0; i < URLS.length; i++) {
      const e = EXTRAS[i] || {};
      await client.query(
        `INSERT INTO videos
          (id, tiktok_url, tiktok_view_url, is_active, is_pickup, badge_label, show_pr_label,
           shop_name, shop_official_url, display_weight, is_fixed_top, fixed_top_start_date, fixed_top_end_date, admin_memo)
         VALUES ($1,$2,$3,true,$4,'今注目',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          `v${i + 1}`,
          URLS[i],
          URLS[i],
          e.is_pickup || false,
          e.show_pr_label || false,
          e.shop_name || null,
          e.shop_official_url || null,
          e.display_weight || 1,
          e.is_fixed_top || false,
          e.fixed_top_start_date || null,
          e.fixed_top_end_date || null,
          e.admin_memo || null,
        ]
      );
    }
    console.log("seeded", URLS.length, "videos");
  }

  const c2 = await client.query("SELECT count(*)::int AS c FROM videos");
  console.log("DONE. videos count =", c2.rows[0].c);
  await client.end();
}

main().catch((e) => {
  console.error("SETUP_ERROR:", e.message);
  process.exit(1);
});
