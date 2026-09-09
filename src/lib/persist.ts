// Persistence + archive/rollback for the single "portfolio" dataset. Full-replace
// on every upload (a weekly master export); the archive of the last ~8 raw
// uploads is the safety net against a bad export overwriting good data.

import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "./db.ts";
import { STORAGE_ROOT } from "./storage.ts";
import { parsePortfolioWorkbook, type ValidationReport } from "./ingest.ts";

const ARCHIVE_DIR = path.join(STORAGE_ROOT, "archive");
const RETAIN = 8;
const DATASET = "portfolio";

export function ensureArchiveDir() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

function archiveRaw(fileName: string, buf: Buffer): string {
  ensureArchiveDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safe = fileName.replace(/[^\w.\- ]/g, "_");
  const dest = path.join(ARCHIVE_DIR, `${DATASET}__${stamp}__${safe}`);
  fs.writeFileSync(dest, buf);
  return dest;
}

export interface PersistResult {
  batchId: string;
  report: ValidationReport;
}

async function createMany2000<R extends object>(
  fn: (data: (R & { batchId: string })[]) => Promise<unknown>,
  rows: R[],
  batchId: string
) {
  for (let i = 0; i < rows.length; i += 2000) {
    await fn(rows.slice(i, i + 2000).map((r) => ({ ...r, batchId })));
  }
}

/** Parse + persist the workbook as a new active batch. Deactivates the prior
 * active batch (kept for rollback) and prunes archives beyond RETAIN. */
export async function persistDataset(fileName: string, buf: Buffer): Promise<PersistResult> {
  const archivePath = archiveRaw(fileName, buf);
  const parsed = parsePortfolioWorkbook(buf);
  const { report } = parsed;

  const totalRead = Object.values(report.rowsRead).reduce((a, b) => a + b, 0);
  const totalKept = Object.values(report.rowsKept).reduce((a, b) => a + b, 0);

  const batch = await prisma.importBatch.create({
    data: {
      dataset: DATASET, fileName, archivePath, report: JSON.stringify(report),
      rowsRead: totalRead, rowsKept: totalKept, rowsDropped: totalRead - totalKept,
      active: true,
    },
  });
  const batchId = batch.id;

  await createMany2000((data) => prisma.asset.createMany({ data }), parsed.assets, batchId);
  await createMany2000((data) => prisma.tenancyRecord.createMany({ data }), parsed.tenancyRecords, batchId);
  await createMany2000((data) => prisma.leaseEvent.createMany({ data }), parsed.leaseEvents, batchId);
  await createMany2000((data) => prisma.assetMetric.createMany({ data }), parsed.assetMetrics, batchId);
  await createMany2000((data) => prisma.homeSummary.createMany({ data }), parsed.homeSummaries, batchId);
  await createMany2000((data) => prisma.developmentMetric.createMany({ data }), parsed.developmentMetrics, batchId);
  await createMany2000((data) => prisma.developmentCashflow.createMany({ data }), parsed.developmentCashflows, batchId);
  await createMany2000((data) => prisma.businessPlanVsCurrent.createMany({ data }), parsed.businessPlanRows, batchId);
  await createMany2000((data) => prisma.developmentTenancySchedule.createMany({ data }), parsed.devTenancySchedule, batchId);
  await createMany2000((data) => prisma.cashflowLine.createMany({ data }), parsed.cashflowLines, batchId);

  await activate(batchId);
  return { batchId, report };
}

/** Make `batchId` the sole active batch; prune old archives beyond RETAIN. */
async function activate(batchId: string) {
  await prisma.importBatch.updateMany({
    where: { dataset: DATASET, id: { not: batchId } },
    data: { active: false },
  });
  await prisma.importBatch.update({ where: { id: batchId }, data: { active: true } });

  const all = await prisma.importBatch.findMany({
    where: { dataset: DATASET }, orderBy: { createdAt: "desc" }, select: { id: true, archivePath: true },
  });
  for (const old of all.slice(RETAIN)) {
    try { if (old.archivePath && fs.existsSync(old.archivePath)) fs.unlinkSync(old.archivePath); } catch {}
    await prisma.importBatch.delete({ where: { id: old.id } }); // cascades to rows
  }
}

/** Roll back to a previous batch (must still exist in the archive table). */
export async function rollbackTo(batchId: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  await activate(batchId);
  return batch;
}

export async function activeBatch() {
  return prisma.importBatch.findFirst({ where: { dataset: DATASET, active: true }, orderBy: { createdAt: "desc" } });
}

export async function importHistory() {
  return prisma.importBatch.findMany({ where: { dataset: DATASET }, orderBy: { createdAt: "desc" } });
}
