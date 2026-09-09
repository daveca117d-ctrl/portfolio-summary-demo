import { NextResponse, type NextRequest } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { persistDataset } from "@/lib/persist";
import { STORAGE_ROOT } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const STAGING = path.join(STORAGE_ROOT, "staging");

// Commit a previously-previewed (staged) upload. Replaces the dataset and
// archives the raw file (handled inside persistDataset).
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || /[^\w-]/.test(token)) {
    return NextResponse.json({ error: "Missing or invalid token." }, { status: 400 });
  }
  const xlsx = path.join(STAGING, `${token}.xlsx`);
  const meta = path.join(STAGING, `${token}.json`);
  if (!fs.existsSync(xlsx) || !fs.existsSync(meta)) {
    return NextResponse.json({ error: "Upload expired — please re-upload." }, { status: 410 });
  }
  const { fileName } = JSON.parse(fs.readFileSync(meta, "utf8")) as { fileName: string };
  const buf = fs.readFileSync(xlsx);

  const { batchId, report } = await persistDataset(fileName, buf);

  try { fs.unlinkSync(xlsx); fs.unlinkSync(meta); } catch {}
  return NextResponse.json({ ok: true, batchId, report });
}
