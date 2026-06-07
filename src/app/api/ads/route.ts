import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import { createAd, deleteAd, listAds, toggleAd } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 一覧（公開=有効のみ / ?all=1 かつ管理者=全件）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1" && isAdmin(req);
    const ads = await listAds(!all);
    return NextResponse.json(ads, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：広告作成（画像はbase64で受け取りDBに保存）
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { label, linkUrl, imageData, imageMime } = await req.json();
    if (!linkUrl || !imageData) {
      return NextResponse.json({ error: "linkUrl と画像が必要です" }, { status: 400 });
    }
    const ad = await createAd({ label: label ?? "", linkUrl, imageData, imageMime: imageMime ?? "image/jpeg" });
    return NextResponse.json(ad);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：表示ON/OFF
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id, isActive } = await req.json();
    await toggleAd(id, !!isActive);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：削除
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });
    await deleteAd(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
