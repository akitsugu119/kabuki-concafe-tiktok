import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import { getAdInterval, getLastChecked, setAdInterval, setLastChecked } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開：設定取得（広告の表示間隔・最終確認日時）
export async function GET() {
  try {
    const [adInterval, lastCheckedAt] = await Promise.all([getAdInterval(), getLastChecked()]);
    return NextResponse.json(
      { adInterval, lastCheckedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：設定更新（adInterval / lastCheckedAt の指定があるものだけ更新）
export async function PUT(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.adInterval !== undefined) await setAdInterval(Number(body.adInterval));
    if (body.lastCheckedAt !== undefined) await setLastChecked(String(body.lastCheckedAt));
    const [adInterval, lastCheckedAt] = await Promise.all([getAdInterval(), getLastChecked()]);
    return NextResponse.json({ ok: true, adInterval, lastCheckedAt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
