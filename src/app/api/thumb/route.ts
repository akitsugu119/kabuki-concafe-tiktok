// TikTok のサムネ画像をサーバー経由で配信（ホットリンク制限/CORS回避）。
// クライアントは /api/thumb?url=<oEmbedのthumbnail_url> を <img src> に使う。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url || !/^https?:\/\/[^/]*tiktokcdn|tiktok\.com/i.test(url)) {
      return new Response("bad url", { status: 400 });
    }
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return new Response("not found", { status: 404 });
    const buf = Buffer.from(await r.arrayBuffer());
    return new Response(buf, {
      headers: {
        "Content-Type": r.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
}
