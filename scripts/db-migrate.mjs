// 旧DB(SRC) → 新DB(DST) へ videos / publish_requests を移行
// 使い方: SRC_DB="postgres://旧" DST_DB="postgres://新" node scripts/db-migrate.mjs
import pg from "pg";

const SRC = process.env.SRC_DB;
const DST = process.env.DST_DB;
if (!SRC || !DST) {
  console.error("SRC_DB / DST_DB が必要です");
  process.exit(1);
}

const src = new pg.Client({ connectionString: SRC, ssl: { rejectUnauthorized: false } });
const dst = new pg.Client({ connectionString: DST, ssl: { rejectUnauthorized: false } });

const DDL_VIDEOS = `
CREATE TABLE IF NOT EXISTS videos (
  id text PRIMARY KEY, seq bigserial,
  tiktok_url text NOT NULL, tiktok_view_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, is_pickup boolean NOT NULL DEFAULT false,
  badge_label text NOT NULL DEFAULT '今注目', show_pr_label boolean NOT NULL DEFAULT false,
  shop_name text, shop_official_url text,
  display_weight int NOT NULL DEFAULT 1, is_fixed_top boolean NOT NULL DEFAULT false,
  fixed_top_start_date timestamptz, fixed_top_end_date timestamptz,
  view_count int NOT NULL DEFAULT 0, tiktok_click_count int NOT NULL DEFAULT 0, shop_click_count int NOT NULL DEFAULT 0,
  admin_memo text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);`;
const DDL_REQS = `
CREATE TABLE IF NOT EXISTS publish_requests (
  id text PRIMARY KEY, seq bigserial,
  tiktok_url text, shop_name text, shop_official_url text, contact text,
  want_pickup boolean DEFAULT false, message text,
  status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now()
);`;

async function main() {
  await src.connect();
  await dst.connect();
  await dst.query(DDL_VIDEOS);
  await dst.query(DDL_REQS);

  const exist = await dst.query("SELECT count(*)::int n FROM videos");
  if (exist.rows[0].n > 0) {
    console.log("DST already has", exist.rows[0].n, "videos. Skip (no overwrite).");
  } else {
    const v = await src.query("SELECT * FROM videos ORDER BY seq ASC");
    for (const r of v.rows) {
      await dst.query(
        `INSERT INTO videos (id, tiktok_url, tiktok_view_url, is_active, is_pickup, badge_label, show_pr_label,
          shop_name, shop_official_url, display_weight, is_fixed_top, fixed_top_start_date, fixed_top_end_date,
          view_count, tiktok_click_count, shop_click_count, admin_memo, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [r.id, r.tiktok_url, r.tiktok_view_url, r.is_active, r.is_pickup, r.badge_label, r.show_pr_label,
         r.shop_name, r.shop_official_url, r.display_weight, r.is_fixed_top, r.fixed_top_start_date, r.fixed_top_end_date,
         r.view_count, r.tiktok_click_count, r.shop_click_count, r.admin_memo, r.created_at, r.updated_at]
      );
    }
    console.log("migrated videos:", v.rows.length);

    const q = await src.query("SELECT * FROM publish_requests ORDER BY seq ASC");
    for (const r of q.rows) {
      await dst.query(
        `INSERT INTO publish_requests (id, tiktok_url, shop_name, shop_official_url, contact, want_pickup, message, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.tiktok_url, r.shop_name, r.shop_official_url, r.contact, r.want_pickup, r.message, r.status, r.created_at]
      );
    }
    console.log("migrated requests:", q.rows.length);
  }

  const vc = await dst.query("SELECT count(*)::int n FROM videos");
  const rc = await dst.query("SELECT count(*)::int n FROM publish_requests");
  console.log("DST now: videos =", vc.rows[0].n, " requests =", rc.rows[0].n);
  await src.end();
  await dst.end();
}
main().catch((e) => { console.error("MIGRATE_ERROR:", e.message); process.exit(1); });
