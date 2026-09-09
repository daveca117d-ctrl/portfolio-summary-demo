import { NextResponse, type NextRequest } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { STORAGE_ROOT } from "@/lib/storage";
import { parsePortfolioWorkbook } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

const STAGING = path.join(STORAGE_ROOT, "staging");

const COUNTERS: Record<string, (batchId: string) => Promise<number>> = {
  assets: (batchId) => prisma.asset.count({ where: { batchId } }),
  tenancyRecords: (batchId) => prisma.tenancyRecord.count({ where: { batchId } }),
  leaseEvents: (batchId) => prisma.leaseEvent.count({ where: { batchId } }),
  assetMetrics: (batchId) => prisma.assetMetric.count({ where: { batchId } }),
  homeSummaries: (batchId) => prisma.homeSummary.count({ where: { batchId } }),
  developmentMetrics: (batchId) => prisma.developmentMetric.count({ where: { batchId } }),
  developmentCashflows: (batchId) => prisma.developmentCashflow.count({ where: { batchId } }),
  businessPlanRows: (batchId) => prisma.businessPlanVsCurrent.count({ where: { batchId } }),
  devTenancySchedule: (batchId) => prisma.developmentTenancySchedule.count({ where: { batchId } }),
  cashflowLines: (batchId) => prisma.cashflowLine.count({ where: { batchId } }),
};

// Nothing is written to the live data here — we parse, stage the raw file, and
// return the validation report + a diff vs current data for the user to confirm.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Provide an .xlsx file." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  fs.mkdirSync(STAGING, { recursive: true });
  const token = randomUUID();
  fs.writeFileSync(path.join(STAGING, `${token}.xlsx`), buf);
  fs.writeFileSync(path.join(STAGING, `${token}.json`), JSON.stringify({ fileName: file.name }));

  const { report } = parsePortfolioWorkbook(buf);

  const currentBatch = await prisma.importBatch.findFirst({ where: { dataset: "portfolio", active: true } });
  const diff: Record<string, string> = {};
  for (const [key, kept] of Object.entries(report.rowsKept)) {
    const counter = COUNTERS[key];
    const prev = currentBatch && counter ? await counter(currentBatch.id) : 0;
    const delta = kept - prev;
    const sign = delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`;
    diff[key] = `${kept} (${sign})`;
  }

  return NextResponse.json({ token, fileName: file.name, report, diff });
}
