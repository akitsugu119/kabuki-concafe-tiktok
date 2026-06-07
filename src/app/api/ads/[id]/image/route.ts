import { getAdImage } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開：広告画像を配信（DBのbase64をデコードして返す）
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const img = await getAdImage(params.id);
    if (!img) return new Response("not found", { status: 404 });
    const buf = Buffer.from(img.data, "base64");
    return new Response(buf, {
      headers: {
        "Content-Type": img.mime || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
}
