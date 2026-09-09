// Server-side ingestion of the single "Master - Portfolio Overview.xlsx" workbook.
// Reads the 9 export-marked sheets, tolerant of header drift between weekly
// exports, and returns parsed records + a validation report. No DB writes here —
// persist.ts does that.

import * as XLSX from "xlsx";
import { coerceNumber, coerceDate, coerceYear, coerceString, coerceMixedNumeric } from "./coerce.ts";

export interface ValidationReport {
  sheetsFound: string[];
  sheetsMissing: string[];
  rowsRead: Record<string, number>;
  rowsKept: Record<string, number>;
  notes: string[];
}

type Row = Record<string, unknown>;

function pickSheet(wb: XLSX.WorkBook, ...candidates: string[]): string | null {
  for (const c of candidates) if (wb.SheetNames.includes(c)) return c;
  return null;
}

/** Resolve a header to its actual key in the row, tolerating case/space/typo
 * drift. Keeps "%" significant — several sheets have both "Amount" and
 * "% Amount" columns (plus stray leading/trailing spaces on the plain-text
 * header, e.g. " Amount "), and stripping "%" too would collide the two. */
function findKey(keys: string[], ...wanted: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]/g, "");
  for (const w of wanted) {
    const wn = norm(w);
    const hit = keys.find((k) => norm(k) === wn);
    if (hit) return hit;
  }
  return null;
}

function sheetRows(wb: XLSX.WorkBook, sheetName: string): Row[] {
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], { defval: null });
}

function get(row: Row, keys: string[], ...wanted: string[]): unknown {
  const k = findKey(keys, ...wanted);
  return k ? row[k] : null;
}

// ─── Records ──────────────────────────────────────────────────────────────

export interface AssetRecord {
  status: string | null; address: string; propertyCode: string | null; postcode: string | null;
  entity: string | null; tenure: string | null; leaseholdGearing: string | null;
  purchaseDate: Date | null; saleDate: Date | null; holdPeriod: number | null; vendor: string | null;
  marketPP: number | null; marketPPPsf: number | null; rentAtPurchase: number | null; niy: number | null;
  wautcAtPurchase: number | null; mcRole: string | null; occupancy: number | null;
  acquisitionNIA: number | null; acquisitionGIA: number | null; currentNIA: number | null;
  currentGIA: number | null; proposedNIA: number | null; proposedGIA: number | null;
  noFloors: number | null; tenants: number | null; contractedRentPa: number | null;
  netRent: number | null; ervPa: number | null; stabilisedErvPa: number | null; partner: string | null;
  partnerImage: string | null; partnerRepresentative: string | null;
  currentCapitalCommitment: number | null; currentEquityCommitment: number | null;
  currentDebtOutstanding: number | null; capexDuringHoldBudget: number | null;
  capexRemainingBudget: number | null; yieldOnCostForecast: number | null; currentValuation: number | null;
  latestValuationDate: Date | null; projectedGDV: number | null; reinstatementValue: number | null;
  receptionName: string | null; receptionEmail: string | null; receptionAddress: string | null;
  practicalCompletionDate: Date | null; amFee: number | null; amFeeBasis: string | null;
  amFeePa: number | null; valuationPsf: number | null; waut: number | null; wautc: number | null;
  epc: string | null; epcExpiry: Date | null; capitalReturn: number | null; profitOnCost: number | null;
  totalReturn: number | null; equityMultiple: number | null; incomeReturn: number | null;
  rollingIRR: number | null; committedEquity: number | null; developmentStartDate: Date | null;
  developmentCompletionDate: Date | null; durationYears: number | null; constructionCost: number | null;
  valuationYield: number | null; valuer: string | null; designStartDate: Date | null;
  noiToDate: number | null; execSum: string | null; currentYearReturn: number | null;
  equivalentYield: number | null; passingRentAtValuation: number | null; image: string | null;
  simpleStatus: string | null;
}

export interface TenancyRecordRow {
  address: string; postcode: string | null; spv: string | null; floor: string | null;
  epcRating: string | null; tenant: string | null; sector: string | null; use: string | null;
  giaSqft: number | null; niaSqft: number | null; itzaArea: number | null; rentPa: number | null;
  rentPsf: number | null; ervPa: number | null; ervPsf: number | null; initialTerm: string | null;
  leaseStart: Date | null; breakOptions: Date | null; nextRentReview: Date | null;
  leaseExpiry: Date | null; remainingTerm: number | null; rentCommencementDate: Date | null;
  initialRentFreePeriod: string | null; rentFreeAfterBreak: string | null; guarantor: string | null;
  subTenants: string | null;
}

export interface LeaseEventRow {
  address: string; floor: string | null; tenant: string | null; leaseExpiry: Date | null;
  status: string | null; annualRent: number | null; rent: number | null; year: number | null;
  contractedIncome: number | null; expiry: number | null; breakValue: number | null; erv: number | null;
}

export interface AssetMetricRow {
  address: string; year: number; category: string; amount: number | null; pctAmount: number | null;
  data: number | null; forecast: number | null; pctAmountForecast: number | null;
  valueGain: number | null; noiToDate: number | null; income: number | null; forecastERV: number | null;
  erv: number | null; income1: number | null; forecastIncome: number | null;
  forecastValueGain: number | null; averageNOI: number | null; passingRent: number | null;
  valuation: number | null;
}

export interface HomeSummaryRow {
  address: string | null; partner: string | null; category: string | null; legend: string | null;
  value: number | null; filter: string | null; developmentYield: number | null;
}

export interface DevelopmentMetricRow {
  asset: string; date: Date | null; category: string | null; amount: number | null;
  businessPlan: number | null; currentBudget: number | null; budgetRentRoll: number | null;
  budgetRentRollPsf: number | null; currentRentRoll: number | null; currentRentRollPsf: number | null;
  image: string | null; mcLogo: string | null;
}

export interface DevelopmentCashflowRow {
  asset: string; date: Date; category: string | null; amount: number | null;
  spendToDate: number | null; forecastedSpend: number | null; cumulativeSpend: number | null;
}

export interface BusinessPlanRow {
  asset: string; order: string | null; category: string | null; target: string | null;
  currentExpectation: string | null; difference: string | null; comment: string | null;
  developmentSummary: string | null; stage: string | null; projectedPC: Date | null;
  projectedStabilisation: Date | null; pctLet: number | null; contractedIncome: number | null;
  marketSalePrice: number | null;
}

export interface DevTenancyScheduleRow {
  asset: string; order: string | null; demise: string | null; targetNIA: number | null;
  targetPsf: number | null; currentExpectationNIA: number | null; sqftDifference: number | null;
  currentExpectationPsf: number | null; psfDifference: number | null; targetRentPa: number | null;
  currentExpectationRentPa: number | null; rentPaDifference: number | null;
}

export interface CashflowLineRow {
  asset: string; segment: string | null; line: string; year: number; value: number | null;
}

export interface ParsedWorkbook {
  assets: AssetRecord[];
  tenancyRecords: TenancyRecordRow[];
  leaseEvents: LeaseEventRow[];
  assetMetrics: AssetMetricRow[];
  homeSummaries: HomeSummaryRow[];
  developmentMetrics: DevelopmentMetricRow[];
  developmentCashflows: DevelopmentCashflowRow[];
  businessPlanRows: BusinessPlanRow[];
  devTenancySchedule: DevTenancyScheduleRow[];
  cashflowLines: CashflowLineRow[];
  report: ValidationReport;
}

// ─── Per-sheet parsers ────────────────────────────────────────────────────

function parseAssets(wb: XLSX.WorkBook, report: ValidationReport): AssetRecord[] {
  const sheet = pickSheet(wb, "Porfolio Data", "Portfolio Data");
  if (!sheet) { report.sheetsMissing.push("Porfolio Data"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["assets"] = rows.length;
  const out: AssetRecord[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const address = coerceString(get(row, keys, "Address"));
    if (!address) continue;
    out.push({
      status: coerceString(get(row, keys, "STATUS", "Status")),
      address,
      propertyCode: coerceString(get(row, keys, "Property Code")),
      postcode: coerceString(get(row, keys, "Postcode")),
      entity: coerceString(get(row, keys, "Entity/SPV")),
      tenure: coerceString(get(row, keys, "Tenure")),
      leaseholdGearing: coerceString(get(row, keys, "Leasehold Gearing")),
      purchaseDate: coerceDate(get(row, keys, "Purchase Date")),
      saleDate: coerceDate(get(row, keys, "Sale Date")),
      holdPeriod: coerceNumber(get(row, keys, "Hold Period")),
      vendor: coerceString(get(row, keys, "Vendor")),
      marketPP: coerceNumber(get(row, keys, "Market PP")),
      marketPPPsf: coerceNumber(get(row, keys, "Market PP psf")),
      rentAtPurchase: coerceNumber(get(row, keys, "Rent p.a. @ Purchase")),
      niy: coerceNumber(get(row, keys, "NIY")),
      wautcAtPurchase: coerceNumber(get(row, keys, "WAUTC @ Purchase")),
      mcRole: coerceString(get(row, keys, "MC Role")),
      occupancy: coerceNumber(get(row, keys, "Occupancy")),
      acquisitionNIA: coerceNumber(get(row, keys, "Acquisition NIA")),
      acquisitionGIA: coerceNumber(get(row, keys, "Acquisition GIA")),
      currentNIA: coerceNumber(get(row, keys, "Current NIA")),
      currentGIA: coerceNumber(get(row, keys, "Current GIA")),
      proposedNIA: coerceNumber(get(row, keys, "Proposed NIA")),
      proposedGIA: coerceNumber(get(row, keys, "Proposed GIA")),
      noFloors: coerceNumber(get(row, keys, "No. Floors")),
      tenants: coerceNumber(get(row, keys, "Tenants")),
      contractedRentPa: coerceNumber(get(row, keys, "Contracted Rent p.a.")),
      netRent: coerceNumber(get(row, keys, "Net Rent")),
      ervPa: coerceNumber(get(row, keys, "ERV p.a.")),
      stabilisedErvPa: coerceNumber(get(row, keys, "Stabilised ERV p.a.")),
      partner: coerceString(get(row, keys, "Partner")),
      partnerImage: coerceString(get(row, keys, "Partner Image")),
      partnerRepresentative: coerceString(get(row, keys, "Partner Representative")),
      currentCapitalCommitment: coerceNumber(get(row, keys, "Current Capital Commitment")),
      currentEquityCommitment: coerceNumber(get(row, keys, "Current Equity Commitment")),
      currentDebtOutstanding: coerceNumber(get(row, keys, "Current Debt Outstanding")),
      capexDuringHoldBudget: coerceNumber(get(row, keys, "Capex during Hold (Budget)")),
      capexRemainingBudget: coerceNumber(get(row, keys, "Capex Remaining (Budget)")),
      yieldOnCostForecast: coerceNumber(get(row, keys, "Yield on Cost (Forecast)")),
      currentValuation: coerceNumber(get(row, keys, "Current Valuation")),
      latestValuationDate: coerceDate(get(row, keys, "Latest Valuation Date")),
      projectedGDV: coerceNumber(get(row, keys, "Projected GDV")),
      reinstatementValue: coerceNumber(get(row, keys, "Reinstatement Value")),
      receptionName: coerceString(get(row, keys, "Reception Name")),
      receptionEmail: coerceString(get(row, keys, "Reception Email")),
      receptionAddress: coerceString(get(row, keys, "Reception Address")),
      practicalCompletionDate: coerceDate(get(row, keys, "Practical Completion Date")),
      amFee: coerceNumber(get(row, keys, "AM Fee", "AM Fee ")),
      amFeeBasis: coerceString(get(row, keys, "AM Fee Basis")),
      amFeePa: coerceNumber(get(row, keys, "AM Fee pa")),
      valuationPsf: coerceNumber(get(row, keys, "Valuation £psf")),
      waut: coerceNumber(get(row, keys, "WAUT")),
      wautc: coerceNumber(get(row, keys, "WAUTC")),
      epc: coerceString(get(row, keys, "EPC")),
      epcExpiry: coerceDate(get(row, keys, "EPC Expiry")),
      capitalReturn: coerceNumber(get(row, keys, "Capital Return")),
      profitOnCost: coerceNumber(get(row, keys, "Profit on Cost")),
      totalReturn: coerceNumber(get(row, keys, "Total Return")),
      equityMultiple: coerceNumber(get(row, keys, "Equity Multiple")),
      incomeReturn: coerceNumber(get(row, keys, "Income Return")),
      rollingIRR: coerceNumber(get(row, keys, "Rolling IRR")),
      committedEquity: coerceNumber(get(row, keys, "Commited Equity", "Committed Equity")),
      developmentStartDate: coerceDate(get(row, keys, "Development Start Date")),
      developmentCompletionDate: coerceDate(get(row, keys, "Development Completion Date")),
      durationYears: coerceNumber(get(row, keys, "Duration (Years)")),
      constructionCost: coerceNumber(get(row, keys, "Construction Cost")),
      valuationYield: coerceNumber(get(row, keys, "Valuation Yield")),
      valuer: coerceString(get(row, keys, "Valuer")),
      designStartDate: coerceDate(get(row, keys, "Design Start Date")),
      noiToDate: coerceNumber(get(row, keys, "NOI To Date")),
      execSum: coerceString(get(row, keys, "Exec Sum")),
      currentYearReturn: coerceNumber(get(row, keys, "Current Year Return")),
      equivalentYield: coerceNumber(get(row, keys, "Equivalent Yield")),
      passingRentAtValuation: coerceNumber(get(row, keys, "Passing Rent at Valuation")),
      image: coerceString(get(row, keys, "IMAGE", "Image")),
      simpleStatus: coerceString(get(row, keys, "Simple Status")),
    });
  }
  report.rowsKept["assets"] = out.length;
  return out;
}

function parseTenancy(wb: XLSX.WorkBook, report: ValidationReport): TenancyRecordRow[] {
  const sheet = pickSheet(wb, "Tenancy Data");
  if (!sheet) { report.sheetsMissing.push("Tenancy Data"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["tenancyRecords"] = rows.length;
  const out: TenancyRecordRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const address = coerceString(get(row, keys, "Address"));
    const tenant = coerceString(get(row, keys, "Tenant"));
    // A row with an address but no tenant is a stray/blank demise row (the
    // sheet occasionally carries these with only a stray date column set).
    if (!address || !tenant) continue;
    out.push({
      address,
      postcode: coerceString(get(row, keys, "Postcode")),
      spv: coerceString(get(row, keys, "SPV")),
      floor: coerceString(get(row, keys, "Floor")),
      epcRating: coerceString(get(row, keys, "EPC Rating")),
      tenant,
      sector: coerceString(get(row, keys, "Sector")),
      use: coerceString(get(row, keys, "Use")),
      giaSqft: coerceNumber(get(row, keys, "GIA (sq.ft)")),
      niaSqft: coerceNumber(get(row, keys, "NIA (sq.ft)")),
      itzaArea: coerceNumber(get(row, keys, "ITZA Area")),
      rentPa: coerceNumber(get(row, keys, "Rent p.a.")),
      rentPsf: coerceNumber(get(row, keys, "Rent psf")),
      ervPa: coerceNumber(get(row, keys, "ERV p.a.")),
      ervPsf: coerceNumber(get(row, keys, "ERV psf")),
      initialTerm: coerceString(get(row, keys, "Initial Term")),
      leaseStart: coerceDate(get(row, keys, "Lease Start")),
      breakOptions: coerceDate(get(row, keys, "Break Options")),
      nextRentReview: coerceDate(get(row, keys, "Next Rent Review")),
      leaseExpiry: coerceDate(get(row, keys, "Lease Expiry")),
      remainingTerm: coerceNumber(get(row, keys, "Remaining Term")),
      rentCommencementDate: coerceDate(get(row, keys, "Rent Commencement Date")),
      initialRentFreePeriod: coerceString(get(row, keys, "Initial Rent Free Period")),
      rentFreeAfterBreak: coerceString(get(row, keys, "Rent Free after Break")),
      guarantor: coerceString(get(row, keys, "Guarantor")),
      subTenants: coerceString(get(row, keys, "Sub-Tenants")),
    });
  }
  report.rowsKept["tenancyRecords"] = out.length;
  return out;
}

function parseLeaseEvents(wb: XLSX.WorkBook, report: ValidationReport): LeaseEventRow[] {
  const sheet = pickSheet(wb, "Expiry & Contracted");
  if (!sheet) { report.sheetsMissing.push("Expiry & Contracted"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["leaseEvents"] = rows.length;
  const out: LeaseEventRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const address = coerceString(get(row, keys, "Address"));
    if (!address) continue;
    out.push({
      address,
      floor: coerceString(get(row, keys, "Floor")),
      tenant: coerceString(get(row, keys, "Tenant")),
      leaseExpiry: coerceDate(get(row, keys, "Lease Expiry")),
      status: coerceString(get(row, keys, "Status")),
      annualRent: coerceNumber(get(row, keys, "Annual Rent")),
      rent: coerceNumber(get(row, keys, "Rent")),
      year: coerceYear(get(row, keys, "Year")),
      contractedIncome: coerceNumber(get(row, keys, "Contracted Income")),
      expiry: coerceNumber(get(row, keys, "Expiry")),
      breakValue: coerceNumber(get(row, keys, "Break")),
      erv: coerceNumber(get(row, keys, "ERV")),
    });
  }
  report.rowsKept["leaseEvents"] = out.length;
  return out;
}

function parseAssetMetrics(wb: XLSX.WorkBook, report: ValidationReport): AssetMetricRow[] {
  const sheet = pickSheet(wb, "Asset Metrics");
  if (!sheet) { report.sheetsMissing.push("Asset Metrics"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["assetMetrics"] = rows.length;
  const out: AssetMetricRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const address = coerceString(get(row, keys, "Address"));
    const year = coerceYear(get(row, keys, "Year"));
    const category = coerceString(get(row, keys, "Category"));
    if (!address || !year || !category) continue;
    out.push({
      address, year, category,
      amount: coerceNumber(get(row, keys, "Amount")),
      pctAmount: coerceNumber(get(row, keys, "% Amount")),
      data: coerceNumber(get(row, keys, "Data")),
      forecast: coerceNumber(get(row, keys, "Forecast")),
      pctAmountForecast: coerceNumber(get(row, keys, "% Amount Forecast")),
      valueGain: coerceNumber(get(row, keys, "Value Gain")),
      noiToDate: coerceNumber(get(row, keys, "NOI TO DATE")),
      income: coerceNumber(get(row, keys, "Income")),
      forecastERV: coerceNumber(get(row, keys, "Forecast ERV")),
      erv: coerceNumber(get(row, keys, "ERV")),
      income1: coerceNumber(get(row, keys, "Income_1")),
      forecastIncome: coerceNumber(get(row, keys, "Forecast Income")),
      forecastValueGain: coerceNumber(get(row, keys, "Forecast Value Gain")),
      averageNOI: coerceNumber(get(row, keys, "Average NOI")),
      passingRent: coerceNumber(get(row, keys, "Passing Rent")),
      valuation: coerceNumber(get(row, keys, "Valuation")),
    });
  }
  report.rowsKept["assetMetrics"] = out.length;
  return out;
}

function parseHomeSummary(wb: XLSX.WorkBook, report: ValidationReport): HomeSummaryRow[] {
  const sheet = pickSheet(wb, "Home");
  if (!sheet) { report.sheetsMissing.push("Home"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["homeSummaries"] = rows.length;
  const out: HomeSummaryRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    out.push({
      address: coerceString(get(row, keys, "Address")),
      partner: coerceString(get(row, keys, "Partner")),
      category: coerceString(get(row, keys, "Category")),
      legend: coerceString(get(row, keys, "Legend")),
      value: coerceNumber(get(row, keys, "Value")),
      filter: coerceString(get(row, keys, "Filter")),
      developmentYield: coerceNumber(get(row, keys, "Development Yield")),
    });
  }
  report.rowsKept["homeSummaries"] = out.length;
  return out;
}

function parseDevelopmentMetrics(wb: XLSX.WorkBook, report: ValidationReport): DevelopmentMetricRow[] {
  const sheet = pickSheet(wb, "Development Metrics");
  if (!sheet) { report.sheetsMissing.push("Development Metrics"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["developmentMetrics"] = rows.length;
  const out: DevelopmentMetricRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const asset = coerceString(get(row, keys, "Asset"));
    if (!asset) continue;
    out.push({
      asset,
      date: coerceDate(get(row, keys, "Date")),
      category: coerceString(get(row, keys, "Category")),
      amount: coerceNumber(get(row, keys, "Amount")),
      businessPlan: coerceNumber(get(row, keys, "Business Plan")),
      currentBudget: coerceNumber(get(row, keys, "Current Budget")),
      budgetRentRoll: coerceNumber(get(row, keys, "Budget Rent Roll")),
      budgetRentRollPsf: coerceNumber(get(row, keys, "Budget Rent Roll Psf")),
      currentRentRoll: coerceNumber(get(row, keys, "Current Rent Roll")),
      currentRentRollPsf: coerceNumber(get(row, keys, "Current Rent Roll Psf")),
      image: coerceString(get(row, keys, "Image")),
      mcLogo: coerceString(get(row, keys, "MC Logo")),
    });
  }
  report.rowsKept["developmentMetrics"] = out.length;
  return out;
}

function parseDevelopmentCashflow(wb: XLSX.WorkBook, report: ValidationReport): DevelopmentCashflowRow[] {
  const sheet = pickSheet(wb, "Development Cashflow");
  if (!sheet) { report.sheetsMissing.push("Development Cashflow"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["developmentCashflows"] = rows.length;
  const out: DevelopmentCashflowRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const asset = coerceString(get(row, keys, "Asset"));
    const date = coerceDate(get(row, keys, "Date"));
    if (!asset || !date) continue;
    out.push({
      asset, date,
      category: coerceString(get(row, keys, "Category")),
      amount: coerceNumber(get(row, keys, "Amount")),
      spendToDate: coerceNumber(get(row, keys, "Spend to Date")),
      forecastedSpend: coerceNumber(get(row, keys, "Forecasted Spend")),
      cumulativeSpend: coerceNumber(get(row, keys, "Cumulative Spend to Date", "Cumulative Spend")),
    });
  }
  report.rowsKept["developmentCashflows"] = out.length;
  return out;
}

function parseBusinessPlan(wb: XLSX.WorkBook, report: ValidationReport): BusinessPlanRow[] {
  const sheet = pickSheet(wb, "Business Plan vs Current");
  if (!sheet) { report.sheetsMissing.push("Business Plan vs Current"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["businessPlanRows"] = rows.length;
  const out: BusinessPlanRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const asset = coerceString(get(row, keys, "Asset"));
    if (!asset) continue;
    out.push({
      asset,
      order: coerceString(get(row, keys, "Order")),
      category: coerceString(get(row, keys, "Category")),
      // Target/Current Expectation/Difference are semantically numeric (serial
      // dates, day-counts, £, %, sq.ft depending on the row's Category) but
      // Excel date-formats some cells, so `coerceMixedNumeric` unwraps any
      // Date XLSX handed back into its raw serial number — formatByCategory /
      // formatDifferenceByCategory then interpret that number per-category.
      target: coerceMixedNumeric(get(row, keys, "Target")),
      currentExpectation: coerceMixedNumeric(get(row, keys, "Current Expectation")),
      difference: coerceMixedNumeric(get(row, keys, "Difference")),
      comment: coerceString(get(row, keys, "Comment")),
      developmentSummary: coerceString(get(row, keys, "Development Summary")),
      stage: coerceString(get(row, keys, "Stage")),
      projectedPC: coerceDate(get(row, keys, "Projected PC")),
      projectedStabilisation: coerceDate(get(row, keys, "Projected Stabilisation")),
      pctLet: coerceNumber(get(row, keys, "% Let")),
      contractedIncome: coerceNumber(get(row, keys, "Contracted Income")),
      marketSalePrice: coerceNumber(get(row, keys, "Market Sale Price")),
    });
  }
  report.rowsKept["businessPlanRows"] = out.length;
  return out;
}

function parseDevTenancySchedule(wb: XLSX.WorkBook, report: ValidationReport): DevTenancyScheduleRow[] {
  const sheet = pickSheet(wb, "Development Tenancy Schedule");
  if (!sheet) { report.sheetsMissing.push("Development Tenancy Schedule"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["devTenancySchedule"] = rows.length;
  const out: DevTenancyScheduleRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const asset = coerceString(get(row, keys, "Asset"));
    if (!asset) continue;
    out.push({
      asset,
      order: coerceString(get(row, keys, "Order")),
      demise: coerceString(get(row, keys, "Demise")),
      targetNIA: coerceNumber(get(row, keys, "Target NIA")),
      targetPsf: coerceNumber(get(row, keys, "Target £psf")),
      currentExpectationNIA: coerceNumber(get(row, keys, "Current Expectation NIA")),
      sqftDifference: coerceNumber(get(row, keys, "Sq.ft Difference")),
      currentExpectationPsf: coerceNumber(get(row, keys, "Current Expectation £psf")),
      psfDifference: coerceNumber(get(row, keys, "£psf Difference")),
      targetRentPa: coerceNumber(get(row, keys, "Target Rent p.a")),
      currentExpectationRentPa: coerceNumber(get(row, keys, "Current Expectation Rent p.a")),
      rentPaDifference: coerceNumber(get(row, keys, "Rent p.a Difference")),
    });
  }
  report.rowsKept["devTenancySchedule"] = out.length;
  return out;
}

function parseCashflow(wb: XLSX.WorkBook, report: ValidationReport): CashflowLineRow[] {
  const sheet = pickSheet(wb, "Cashflow Input", "Cashflow");
  if (!sheet) { report.sheetsMissing.push("Cashflow Input"); return []; }
  report.sheetsFound.push(sheet);
  const rows = sheetRows(wb, sheet);
  report.rowsRead["cashflowLines"] = rows.length;
  const out: CashflowLineRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const asset = coerceString(get(row, keys, "Asset"));
    const line = coerceString(get(row, keys, "Line"));
    if (!asset || !line) continue;
    // second column is unlabeled in the source (holds "Stabilised" / "Development")
    const segmentKey = keys.find((k) => /^_?\d*$|^__EMPTY/i.test(k) || k.trim() === "");
    const segment = segmentKey ? coerceString(row[segmentKey]) : null;
    for (const key of keys) {
      const year = /^\d{4}$/.test(key.trim()) ? Number(key.trim()) : null;
      if (!year) continue;
      const value = coerceNumber(row[key]);
      if (value == null) continue;
      out.push({ asset, segment, line, year, value });
    }
  }
  report.rowsKept["cashflowLines"] = out.length;
  return out;
}

// ─── Entry point ──────────────────────────────────────────────────────────

export function parsePortfolioWorkbook(buf: ArrayBuffer | Buffer): ParsedWorkbook {
  const wb = XLSX.read(buf, { cellDates: true });
  const report: ValidationReport = {
    sheetsFound: [], sheetsMissing: [], rowsRead: {}, rowsKept: {}, notes: [],
  };

  const assets = parseAssets(wb, report);
  const tenancyRecords = parseTenancy(wb, report);
  const leaseEvents = parseLeaseEvents(wb, report);
  const assetMetrics = parseAssetMetrics(wb, report);
  const homeSummaries = parseHomeSummary(wb, report);
  const developmentMetrics = parseDevelopmentMetrics(wb, report);
  const developmentCashflows = parseDevelopmentCashflow(wb, report);
  const businessPlanRows = parseBusinessPlan(wb, report);
  const devTenancySchedule = parseDevTenancySchedule(wb, report);
  const cashflowLines = parseCashflow(wb, report);

  if (report.sheetsMissing.length) {
    report.notes.push(`Missing sheets: ${report.sheetsMissing.join(", ")}`);
  }

  return {
    assets, tenancyRecords, leaseEvents, assetMetrics, homeSummaries,
    developmentMetrics, developmentCashflows, businessPlanRows, devTenancySchedule,
    cashflowLines, report,
  };
}
