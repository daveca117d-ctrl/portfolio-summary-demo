// Seeds the demo deployment from the committed prisma/demo-data.json snapshot
// — a curated, anonymised 3-asset capability-pitch dataset (Buckingham
// Palace / House of Parliament / Gherkin standing in for real addresses).
// Self-contained: unlike prisma/seed.ts (which needs the real workbook),
// this needs nothing but the JSON file, so it can run unattended on Railway.
// Idempotent — clears existing data and reloads every run.

import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "../src/lib/db.ts";

interface Snapshot {
  assets: Record<string, unknown>[];
  tenancyRecords: Record<string, unknown>[];
  leaseEvents: Record<string, unknown>[];
  assetMetrics: Record<string, unknown>[];
  homeSummaries: Record<string, unknown>[];
  developmentMetrics: Record<string, unknown>[];
  developmentCashflows: Record<string, unknown>[];
  developmentTenancySchedule: Record<string, unknown>[];
  cashflowLines: Record<string, unknown>[];
  businessPlanRows: Record<string, unknown>[];
}

function strip(rows: Record<string, unknown>[], batchId: string) {
  return rows.map(({ id: _id, batchId: _b, ...rest }) => ({ ...rest, batchId }));
}

async function main() {
  const file = path.join(process.cwd(), "prisma", "demo-data.json");
  const snapshot: Snapshot = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("Seeding demo data from", file);
  await prisma.importBatch.deleteMany(); // cascades all tables

  const batch = await prisma.importBatch.create({
    data: {
      dataset: "portfolio",
      fileName: "demo-curated.xlsx",
      archivePath: "demo",
      rowsRead: 0, rowsKept: 0, rowsDropped: 0,
      report: JSON.stringify({ notes: ["Curated 3-asset capability demo — not a real workbook import."] }),
      active: true,
    },
  });
  const batchId = batch.id;

  await prisma.asset.createMany({ data: strip(snapshot.assets, batchId) as never });
  await prisma.tenancyRecord.createMany({ data: strip(snapshot.tenancyRecords, batchId) as never });
  await prisma.leaseEvent.createMany({ data: strip(snapshot.leaseEvents, batchId) as never });
  await prisma.assetMetric.createMany({ data: strip(snapshot.assetMetrics, batchId) as never });
  await prisma.homeSummary.createMany({ data: strip(snapshot.homeSummaries, batchId) as never });
  await prisma.developmentMetric.createMany({ data: strip(snapshot.developmentMetrics, batchId) as never });
  await prisma.developmentCashflow.createMany({ data: strip(snapshot.developmentCashflows, batchId) as never });
  await prisma.developmentTenancySchedule.createMany({ data: strip(snapshot.developmentTenancySchedule, batchId) as never });
  await prisma.cashflowLine.createMany({ data: strip(snapshot.cashflowLines, batchId) as never });
  await prisma.businessPlanVsCurrent.createMany({ data: strip(snapshot.businessPlanRows, batchId) as never });

  console.log("Demo seed complete:", snapshot.assets.map((a) => a.address).join(", "));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
