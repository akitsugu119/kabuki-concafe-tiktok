// 広告(バナー)用テーブル + 設定テーブルを作成
// 使い方: DST_DB="postgres://neon..." node scripts/db-ads-setup.mjs
import pg from "pg";
const conn = process.env.DST_DB || process.env.DATABASE_URL;
if (!conn) { console.error("DST_DB が必要"); process.exit(1); }
const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query(`
  CREATE TABLE IF NOT EXISTS ads (
    id text PRIMARY KEY,
    seq bigserial,
    label text NOT NULL DEFAULT '',
    link_url text NOT NULL,
    image_data text NOT NULL,
    image_mime text NOT NULL DEFAULT 'image/jpeg',
    is_active boolean NOT NULL DEFAULT true,
    view_count int NOT NULL DEFAULT 0,
    click_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`);
await c.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value text NOT NULL
  );
`);
await c.query(`INSERT INTO settings (key, value) VALUES ('ad_interval','7') ON CONFLICT (key) DO NOTHING;`);
const a = await c.query("SELECT count(*)::int n FROM ads");
const s = await c.query("SELECT value FROM settings WHERE key='ad_interval'");
console.log("ads table ready. ads count =", a.rows[0].n, " ad_interval =", s.rows[0].value);
await c.end();
