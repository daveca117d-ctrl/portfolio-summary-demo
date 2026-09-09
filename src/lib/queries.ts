import "server-only";
import { prisma } from "./db.ts";

// ─── Batch / meta ───────────────────────────────────────────────────────────

async function activeBatchId(): Promise<string | null> {
  const b = await prisma.importBatch.findFirst({ where: { dataset: "portfolio", active: true } });
  return b?.id ?? null;
}

export async function getLastUpdated(): Promise<string | undefined> {
  const b = await prisma.importBatch.findFirst({ where: { dataset: "portfolio", active: true } });
  if (!b) return undefined;
  return `Data to ${b.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}

export async function getImportHistory() {
  return prisma.importBatch.findMany({ where: { dataset: "portfolio" }, orderBy: { createdAt: "desc" } });
}

export async function getPartners(): Promise<string[]> {
  const batchId = await activeBatchId();
  if (!batchId) return [];
  const rows = await prisma.asset.findMany({
    where: { batchId, partner: { not: null } },
    distinct: ["partner"],
    select: { partner: true },
    orderBy: { partner: "asc" },
  });
  return rows.map((r) => r.partner!).filter(Boolean);
}

type Filters = { partner?: string };

// Population rule (per Simple Status in the source "Porfolio Data" sheet):
// exclude "Example" (template/placeholder rows, Partner "Client 1") and
// exclude Simple Status "Exited" (sold/former holdings — this also covers
// every STATUS="Historic" row, which is always paired with Exited). Simple
// Status "On Site"/"Future Scheme" are Development; "Stabilised" is Asset
// Management — see STABILISED_STATUSES/DEVELOPMENT_STATUSES below.
function assetWhere(batchId: string, filters: Filters) {
  return {
    batchId,
    status: { not: "Example" },
    simpleStatus: { not: "Exited" },
    ...(filters.partner ? { partner: filters.partner } : {}),
  };
}

const DEVELOPMENT_STATUSES = ["On Site", "Future Scheme"];

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Valuation-weighted average — matches the source report's portfolio rollups
 * (Rolling IRR, Occupancy, Yield on Cost, WAULT/WAULTC use this, not a plain mean). */
function weightedAverage(items: { value: number | null | undefined; weight: number | null | undefined }[]): number | null {
  let num = 0, den = 0;
  for (const { value, weight } of items) {
    if (value == null || weight == null || !Number.isFinite(value) || !Number.isFinite(weight)) continue;
    num += value * weight;
    den += weight;
  }
  return den > 0 ? num / den : null;
}

function sum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((a, v) => a + (v ?? 0), 0);
}

/** Ratio of sums — matches the source report's Capital/Total/Income Return
 * measures, which divide a summed £ gain by summed Current Capital Commitment
 * (those "Return" columns are £ amounts in the source, not ratios). */
function ratioOfSums(numerator: number, denominator: number): number | null {
  return denominator !== 0 ? numerator / denominator : null;
}

// ─── Home page ──────────────────────────────────────────────────────────────

export interface HomePanel {
  committedCapital: number;
  valuation: number; // or GDV for development
  capitalGainPct: number | null;
  capitalGainAmount: number;
  passingIncome: number;
  erv: number;
  noiToDate: number;
  seeThroughRent: number;
  assetCount: number;
  tenantCount: number;
  occupancyPct: number | null;
  waultYears: number | null;
  forecastReturnPct: number | null;
  developmentYieldPct: number | null;
  proposedNIA: number;
  portfolioPie: { name: string; value: number }[];
  capitalPositionBars: { legend: string; value: number }[];
}

export async function getHomeData(filters: Filters): Promise<{ stabilised: HomePanel; development: HomePanel } | null> {
  const batchId = await activeBatchId();
  if (!batchId) return null;

  const assets = await prisma.asset.findMany({ where: assetWhere(batchId, filters) });
  const stabilisedAssets = assets.filter((a) => a.simpleStatus === "Stabilised");
  const developmentAssets = assets.filter((a) => DEVELOPMENT_STATUSES.includes(a.simpleStatus ?? ""));

  const tenancy = await prisma.tenancyRecord.findMany({
    where: { batchId, address: { in: assets.map((a) => a.address) } },
    select: { address: true, tenant: true },
  });
  const tenantsFor = (addresses: string[]) => {
    const set = new Set(addresses);
    return new Set(tenancy.filter((t) => set.has(t.address) && t.tenant).map((t) => t.tenant)).size;
  };

  const home = await prisma.homeSummary.findMany({
    where: { batchId, ...(filters.partner ? { partner: filters.partner } : {}) },
  });
  const barsFor = (filter: "AM" | "DM") => {
    const rows = home.filter((h) => h.filter === filter);
    const byLegend = new Map<string, number>();
    for (const r of rows) byLegend.set(r.legend ?? "—", (byLegend.get(r.legend ?? "—") ?? 0) + (r.value ?? 0));
    return Array.from(byLegend, ([legend, value]) => ({ legend, value }));
  };

  const stabilised: HomePanel = {
    committedCapital: sum(stabilisedAssets.map((a) => a.currentCapitalCommitment)),
    valuation: sum(stabilisedAssets.map((a) => a.currentValuation)),
    capitalGainAmount: sum(stabilisedAssets.map((a) => a.currentValuation)) - sum(stabilisedAssets.map((a) => a.currentCapitalCommitment)),
    capitalGainPct: ratioOfSums(
      sum(stabilisedAssets.map((a) => a.capitalReturn)),
      sum(stabilisedAssets.map((a) => a.currentCapitalCommitment))
    ),
    passingIncome: sum(stabilisedAssets.map((a) => a.contractedRentPa)),
    erv: sum(stabilisedAssets.map((a) => a.ervPa)),
    noiToDate: sum(stabilisedAssets.map((a) => a.noiToDate)),
    seeThroughRent: sum(stabilisedAssets.map((a) => a.stabilisedErvPa)),
    assetCount: stabilisedAssets.length,
    tenantCount: tenantsFor(stabilisedAssets.map((a) => a.address)),
    occupancyPct: weightedAverage(stabilisedAssets.map((a) => ({ value: a.occupancy, weight: a.currentValuation }))),
    waultYears: weightedAverage(stabilisedAssets.map((a) => ({ value: a.wautc, weight: a.currentValuation }))),
    forecastReturnPct: null,
    developmentYieldPct: null,
    proposedNIA: 0,
    portfolioPie: stabilisedAssets
      .filter((a) => a.currentValuation)
      .map((a) => ({ name: a.address, value: a.currentValuation ?? 0 }))
      .sort((a, b) => b.value - a.value),
    capitalPositionBars: barsFor("AM"),
  };

  const development: HomePanel = {
    committedCapital: sum(developmentAssets.map((a) => a.currentCapitalCommitment)),
    valuation: sum(developmentAssets.map((a) => a.projectedGDV)),
    capitalGainAmount: sum(developmentAssets.map((a) => a.projectedGDV)) - sum(developmentAssets.map((a) => a.currentCapitalCommitment)),
    capitalGainPct: null,
    passingIncome: 0,
    erv: sum(developmentAssets.map((a) => a.ervPa)),
    noiToDate: 0,
    seeThroughRent: 0,
    assetCount: developmentAssets.length,
    tenantCount: 0,
    occupancyPct: null,
    waultYears: null,
    forecastReturnPct: ratioOfSums(
      sum(developmentAssets.map((a) => a.projectedGDV)) - sum(developmentAssets.map((a) => a.currentCapitalCommitment)),
      sum(developmentAssets.map((a) => a.currentCapitalCommitment))
    ),
    developmentYieldPct: weightedAverage(developmentAssets.map((a) => ({ value: a.yieldOnCostForecast, weight: a.projectedGDV }))),
    proposedNIA: sum(developmentAssets.map((a) => a.proposedNIA)),
    portfolioPie: developmentAssets
      .filter((a) => a.projectedGDV)
      .map((a) => ({ name: a.address, value: a.projectedGDV ?? 0 }))
      .sort((a, b) => b.value - a.value),
    capitalPositionBars: barsFor("DM"),
  };

  return { stabilised, development };
}

// ─── Asset Management page ──────────────────────────────────────────────────

// Asset Management lists Stabilised assets only — Development assets live on
// the Development tab instead (matches the source report's own address lists).
export async function getAssetAddresses(filters: Filters): Promise<string[]> {
  const batchId = await activeBatchId();
  if (!batchId) return [];
  const rows = await prisma.asset.findMany({
    where: { ...assetWhere(batchId, filters), simpleStatus: "Stabilised" },
    select: { address: true }, orderBy: { address: "asc" },
  });
  return rows.map((r) => r.address);
}

export async function getAssetDetail(address: string) {
  const batchId = await activeBatchId();
  if (!batchId) return null;
  const asset = await prisma.asset.findFirst({ where: { batchId, address } });
  if (!asset) return null;

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 10; // full historic actuals + a rolling 10-year forecast window

  const tenancy = await prisma.tenancyRecord.findMany({ where: { batchId, address }, orderBy: { rentPa: "desc" } });
  const metrics = await prisma.assetMetric.findMany({ where: { batchId, address, year: { lte: maxYear } }, orderBy: { year: "asc" } });
  const leaseEvents = await prisma.leaseEvent.findMany({ where: { batchId, address }, orderBy: { year: "asc" } });

  // Pivot the long-format AssetMetric rows into per-chart series.
  const byYear = new Map<number, typeof metrics[number][]>();
  for (const m of metrics) {
    if (!byYear.has(m.year)) byYear.set(m.year, []);
    byYear.get(m.year)!.push(m);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  const pick = (year: number, category: string) => byYear.get(year)?.find((m) => m.category === category);

  // "Historic & Forecasted Property Information" — one chart, metric picked
  // by the user, matching the source report's dropdown selector.
  const PROPERTY_INFO_CATEGORIES = [
    "CAPITAL EXPENDITURE", "COMMITTED CAPITAL", "COMMITTED EQUITY", "ERV",
    "INCOME", "NOI", "OPEX", "YEAR END VALUATION",
  ] as const;
  const propertyInfoSeries = Object.fromEntries(
    PROPERTY_INFO_CATEGORIES.map((category) => [
      category,
      years.map((year) => {
        const row = pick(year, category);
        return { year, actual: year < currentYear ? row?.amount ?? row?.valuation ?? null : null, forecast: row?.forecast ?? null };
      }),
    ])
  ) as Record<(typeof PROPERTY_INFO_CATEGORIES)[number], { year: number; actual: number | null; forecast: number | null }[]>;

  const irrSeries = years.map((year) => {
    const row = pick(year, "ROLLING IRR");
    return { year, actual: year < currentYear ? row?.amount ?? null : null, forecast: row?.forecast ?? null };
  });
  const totalReturnSeries = years.map((year) => {
    const row = pick(year, "TOTAL ANNUAL RETURN");
    return { year, actual: year < currentYear ? row?.amount ?? null : null, forecast: row?.forecast ?? null };
  });
  const noiSeries = years.map((year) => {
    const row = pick(year, "NOI");
    return { year, actual: year < currentYear ? row?.amount ?? null : null, forecast: row?.forecast ?? null };
  });
  const incomeVsErvSeries = years.map((year) => {
    const income = pick(year, "INCOME");
    const erv = pick(year, "ERV");
    return {
      year,
      income: year < currentYear ? income?.amount ?? null : null,
      incomeForecast: income?.forecast ?? null,
      erv: erv?.amount ?? erv?.erv ?? null,
      ervForecast: erv?.forecast ?? null,
    };
  });

  // Rent-at-risk: rent value at risk that year from "Expiry & Contracted",
  // vs the building's Contracted Income and ERV for that same calendar year
  // from Asset Metrics (categories "INCOME" / "ERV") — the Expiry & Contracted
  // sheet's own per-lease Contracted Income/ERV columns are blank/overstated
  // in the source, so both are looked up per-year here instead.
  //
  // The source rows come in two flavours (a `status` column distinguishes
  // them) that each carry their £ value in a *different* field: rows with
  // status "Lease Expiry" hold the value in `expiry`, rows with status
  // "Lease Break" hold it in `breakValue` — kept as two separate series
  // (expiry vs break-option risk), not combined.
  const rentAtRiskByYear = new Map<number, { contracted: number; erv: number; expiryValue: number; breakValue: number }>();
  for (const e of leaseEvents) {
    // A handful of source rows carry a stray/default Year (e.g. 1900) — drop
    // anything outside a plausible lease-expiry window.
    if (!e.year || e.year < currentYear - 10 || e.year > maxYear) continue;
    const row = rentAtRiskByYear.get(e.year) ?? { contracted: 0, erv: 0, expiryValue: 0, breakValue: 0 };
    row.expiryValue += e.expiry ?? 0;
    row.breakValue += e.breakValue ?? 0;
    rentAtRiskByYear.set(e.year, row);
  }
  for (const [year, row] of rentAtRiskByYear) {
    // Future years only carry a "Forecast" value in the source (Amount is
    // null once the year is beyond actuals) — fall back to it.
    const incomeRow = pick(year, "INCOME");
    row.contracted = incomeRow?.amount ?? incomeRow?.forecast ?? 0;
    const ervRow = pick(year, "ERV");
    row.erv = ervRow?.amount ?? ervRow?.forecast ?? ervRow?.erv ?? 0;
  }
  const rentAtRisk = Array.from(rentAtRiskByYear, ([year, v]) => ({ year, ...v })).sort((a, b) => a.year - b.year);

  const bySector = new Map<string, number>();
  const byTenant = new Map<string, number>();
  for (const t of tenancy) {
    if (t.sector) bySector.set(t.sector, (bySector.get(t.sector) ?? 0) + (t.rentPa ?? 0));
    if (t.tenant) byTenant.set(t.tenant, (byTenant.get(t.tenant) ?? 0) + (t.rentPa ?? 0));
  }
  const toPie = (m: Map<string, number>) => Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return {
    asset, tenancy,
    propertyInfoSeries, irrSeries, totalReturnSeries, noiSeries, incomeVsErvSeries,
    rentAtRisk,
    tenantPie: toPie(byTenant),
    sectorPie: toPie(bySector),
  };
}

// ─── Development page ────────────────────────────────────────────────────────

export async function getDevelopmentAssets(filters: Filters): Promise<string[]> {
  const batchId = await activeBatchId();
  if (!batchId) return [];
  const rows = await prisma.asset.findMany({
    where: { ...assetWhere(batchId, filters), simpleStatus: { in: DEVELOPMENT_STATUSES } },
    select: { address: true },
    orderBy: { address: "asc" },
  });
  return rows.map((r) => r.address);
}

export async function getDevelopmentDetail(asset: string) {
  const batchId = await activeBatchId();
  if (!batchId) return null;

  const portfolioAsset = await prisma.asset.findFirst({ where: { batchId, address: asset } });
  const planRows = await prisma.businessPlanVsCurrent.findMany({ where: { batchId, asset }, orderBy: { order: "asc" } });
  const tenancySchedule = await prisma.developmentTenancySchedule.findMany({ where: { batchId, asset }, orderBy: { order: "asc" } });
  const cashflow = await prisma.developmentCashflow.findMany({ where: { batchId, asset }, orderBy: { date: "asc" } });

  // Raw per-period (not cumulative) actual/forecast spend by category — drives
  // both the Capex Progress chart (category filter + cumulative line) and the
  // Budget Progression chart (stacked cumulative area per category) on the
  // client. Development Metrics' own Date/Amount columns are blank in the
  // source, so both charts are built from Development Cashflow instead.
  const cashflowRows = cashflow.map((c) => ({
    date: c.date.toISOString().slice(0, 10),
    category: c.category ?? "Other",
    spend: c.spendToDate ?? 0,
    forecast: c.forecastedSpend ?? 0,
  }));
  const cashflowCategories = Array.from(new Set(cashflowRows.map((r) => r.category))).sort();

  return { asset: portfolioAsset, planRows, tenancySchedule, cashflowRows, cashflowCategories };
}

// ─── Cashflow page ───────────────────────────────────────────────────────────

export async function getCashflowAssets(filters: Filters): Promise<string[]> {
  const batchId = await activeBatchId();
  if (!batchId) return [];
  const rows = await prisma.asset.findMany({ where: assetWhere(batchId, filters), select: { address: true }, orderBy: { address: "asc" } });
  return rows.map((r) => r.address);
}

export async function getCashflowData(asset: string | undefined, filters: Filters = {}) {
  const batchId = await activeBatchId();
  if (!batchId) return null;
  const addressFilter = asset
    ? { asset }
    : { asset: { in: (await prisma.asset.findMany({ where: assetWhere(batchId, filters), select: { address: true } })).map((a) => a.address) } };
  // Full historic actuals, plus a rolling 10-year forecast window from today —
  // the source workbook carries placeholder rows out to 2050 that aren't
  // meant to be shown yet.
  const maxYear = new Date().getFullYear() + 10;
  const lines = await prisma.cashflowLine.findMany({
    where: { batchId, year: { lte: maxYear }, ...addressFilter },
    orderBy: [{ year: "asc" }],
  });

  const years = Array.from(new Set(lines.map((l) => l.year))).sort((a, b) => a - b);
  const byLine = new Map<string, Map<number, number>>();
  for (const l of lines) {
    if (!byLine.has(l.line)) byLine.set(l.line, new Map());
    const m = byLine.get(l.line)!;
    m.set(l.year, (m.get(l.year) ?? 0) + (l.value ?? 0));
  }

  const capexLines = ["CAPITAL EXPENDITURE", "PURCHASE COSTS", "COMMITTED CAPITAL"];
  const incomeLines = ["INCOME", "OPEX", "NOI"];
  const rowsFor = (lineNames: string[]) =>
    lineNames
      .filter((name) => byLine.has(name))
      .map((name) => ({ line: name, values: years.map((y) => byLine.get(name)?.get(y) ?? null) }));

  return { years, capexRows: rowsFor(capexLines), incomeRows: rowsFor(incomeLines) };
}
