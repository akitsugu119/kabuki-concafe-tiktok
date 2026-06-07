import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import {
  deleteVideo,
  listVideos,
  patchVideo,
  upsertVideo,
} from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開：動画一覧
export async function GET() {
  try {
    const videos = await listVideos();
    return NextResponse.json(videos, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：作成・更新
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const v = await upsertVideo(body);
    return NextResponse.json(v);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：トグル等の部分更新
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id, patch } = await req.json();
    await patchVideo(id, patch);
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
    await deleteVideo(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
