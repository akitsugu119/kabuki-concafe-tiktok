// テストデータ掃除用（テスト広告依頼を削除して件数表示）
import pg from "pg";
import fs from "fs";
import path from "path";
const conn =
  process.env.DB_URL ||
  fs.readFileSync(path.join(process.env.TEMP || "/tmp", "kabuki_db_ext.txt"), "utf8").trim();
const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query("DELETE FROM publish_requests WHERE contact = 'test@example.com'");
console.log("deleted test requests:", r.rowCount);
const v = await c.query("SELECT count(*)::int n FROM videos");
const q = await c.query("SELECT count(*)::int n FROM publish_requests");
console.log("videos =", v.rows[0].n, " requests =", q.rows[0].n);
await c.end();
