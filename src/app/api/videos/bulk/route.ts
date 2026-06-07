import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import { bulkInsertVideos } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理：複数URLまとめて登録
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { urls } = await req.json();
    const result = await bulkInsertVideos(Array.isArray(urls) ? urls : []);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
