import { NextResponse } from "next/server";
import { incrementAdCounter } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開：広告の表示回数・クリック数を加算
export async function POST(req: Request) {
  try {
    const { id, field } = await req.json();
    if (!id || !field) return NextResponse.json({ error: "bad request" }, { status: 400 });
    await incrementAdCounter(String(id), String(field));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
