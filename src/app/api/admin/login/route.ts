import { NextResponse } from "next/server";
import { checkPasscode } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理パスコードの照合（サーバー側 ADMIN_SECRET と比較）
export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    return NextResponse.json({ ok: checkPasscode(String(key ?? "")) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
