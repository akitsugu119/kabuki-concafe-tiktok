import { NextResponse } from "next/server";

// ===================================================================
// TikTok 短縮URL（vt.tiktok.com/...）→ 動画ID 解決API
// -------------------------------------------------------------------
// TikTok 公式 oEmbed を「サーバー側」で叩いて動画ID等を取得する。
// 動画ファイルは保存せず、公式埋め込みに必要な情報だけを返す。
// ===================================================================

export const runtime = "nodejs";
// 24時間キャッシュ（同じURLの再解決を避ける）
export const revalidate = 86400;

interface OEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  embed_product_id?: string;
  html?: string;
}

function extractId(o: OEmbed): string | null {
  if (o.embed_product_id && /^\d+$/.test(o.embed_product_id)) return o.embed_product_id;
  const m = (o.html || "").match(/data-video-id="(\d+)"/);
  if (m) return m[1];
  const c = (o.html || "").match(/\/video\/(\d+)/);
  return c ? c[1] : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !/^https?:\/\/([a-z0-9.-]+\.)?tiktok\.com\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://www.tiktok.com/oembed?url=" + encodeURIComponent(url),
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "unavailable" }, { status: 404 });
    }
    const data = (await res.json()) as OEmbed;
    const videoId = extractId(data);
    if (!videoId) {
      return NextResponse.json({ error: "no_id" }, { status: 404 });
    }
    return NextResponse.json(
      {
        videoId,
        authorName: data.author_name ?? null,
        authorUrl: data.author_url ?? null,
        thumbnailUrl: data.thumbnail_url ?? null,
        title: data.title ?? null,
      },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
