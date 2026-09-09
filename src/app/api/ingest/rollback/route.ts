import { NextResponse, type NextRequest } from "next/server";
import { rollbackTo } from "@/lib/persist";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { batchId } = await req.json();
  if (!batchId) return NextResponse.json({ error: "Missing batchId." }, { status: 400 });
  try {
    const batch = await rollbackTo(batchId);
    return NextResponse.json({ ok: true, dataset: batch.dataset });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
