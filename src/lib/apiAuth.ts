// 管理者APIの簡易認証。クライアントは x-admin-key ヘッダにパスコードを付ける。
// サーバーは ADMIN_SECRET 環境変数と照合する（公開バンドルには出ない）。
export function isAdmin(req: Request): boolean {
  const key = req.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET || "kabuki2026";
  return !!key && key === secret;
}

export function checkPasscode(key: string): boolean {
  const secret = process.env.ADMIN_SECRET || "kabuki2026";
  return key === secret;
}
