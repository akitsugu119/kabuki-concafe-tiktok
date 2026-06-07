import { Pool } from "pg";

// ===================================================================
// PostgreSQL 接続プール（サーバー専用）
// DATABASE_URL は Render の環境変数で設定する。
// - 外部接続（*.render.com）は SSL 必須
// - 内部接続（Render内部ネットワーク）は SSL 不要
// HMR で複数プールが作られないよう globalThis にキャッシュする。
// ===================================================================

const conn = process.env.DATABASE_URL;

const g = globalThis as unknown as { __kabukiPool?: Pool };

// ホスト名がドメイン（ドットを含む）なら外部接続＝SSL必須と判定。
// Render内部接続の短いホスト（例 dpg-xxxx-a）はドットが無いのでSSL不要。
// これで Neon / Supabase / Render など、どのPostgreSQLでも同じコードで動く。
function needsSsl(connectionString: string): boolean {
  if (/sslmode=require/i.test(connectionString)) return true;
  const m = connectionString.match(/@([^/:?]+)/);
  const host = m ? m[1] : "";
  return host.includes(".");
}

export function getPool(): Pool {
  if (!conn) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!g.__kabukiPool) {
    g.__kabukiPool = new Pool({
      connectionString: conn,
      ssl: needsSsl(conn) ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return g.__kabukiPool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
