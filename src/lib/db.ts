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

export function getPool(): Pool {
  if (!conn) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!g.__kabukiPool) {
    g.__kabukiPool = new Pool({
      connectionString: conn,
      ssl: conn.includes(".render.com") ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return g.__kabukiPool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
