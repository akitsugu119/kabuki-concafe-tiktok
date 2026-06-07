import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import { getAdInterval, setAdInterval } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開：設定取得（広告の表示間隔）
export async function GET() {
  try {
    const adInterval = await getAdInterval();
    return NextResponse.json({ adInterval }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：設定更新
export async function PUT(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { adInterval } = await req.json();
    await setAdInterval(Number(adInterval));
    return NextResponse.json({ ok: true, adInterval: await getAdInterval() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
