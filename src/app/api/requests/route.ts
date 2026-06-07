import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/apiAuth";
import {
  addPublishRequest,
  listPublishRequests,
  setPublishRequestStatus,
} from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理：広告依頼一覧
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const list = await listPublishRequests();
    return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 公開：広告依頼の送信
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r = await addPublishRequest({
      tiktokUrl: body.tiktokUrl ?? "",
      shopName: body.shopName ?? "",
      shopOfficialUrl: body.shopOfficialUrl ?? "",
      contact: body.contact ?? "",
      wantPickup: !!body.wantPickup,
      message: body.message ?? "",
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 管理：対応済みなどステータス変更
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id, status } = await req.json();
    await setPublishRequestStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
