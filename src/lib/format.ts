export function fmtGBP(v: number | null | undefined, opts: { decimals?: number } = {}): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const d = opts.decimals ?? 0;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
}

/** Compact £ for headline stat tiles, e.g. £536.5M / £1.2Bn / £108.0K */
export function fmtGBPCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `£${(v / 1_000_000_000).toFixed(1)}Bn`;
  if (abs >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `£${(v / 1_000).toFixed(1)}K`;
  return fmtGBP(v);
}

export function fmtPct(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  // values are stored as decimals (0.088 = 8.8%) per the source workbook
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtSqft(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString("en-GB")} sq.ft`;
}

export function fmtNumber(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const FINANCE_CATEGORIES = ["ltc", "total facility", "reference rate", "margin rate", "total interest", "other finance costs"];
const DATE_CATEGORIES = /acquisition date|planning consent|construction start|construction completion|fully let date/;
const VOID_CATEGORIES = /ave\. letting void|ave\. rent free/;

/**
 * Category-driven formatter for the Business Plan vs Current variance table's
 * Target / Current Expectation columns. Mirrors the source report's DAX
 * (separate Target/Current Expectation measures), which dispatch on
 * substrings in the category label rather than a fixed per-row type, so it
 * stays correct if the category list changes. Date-category values here are
 * genuine date serials — rendered as calendar dates.
 */
export function formatByCategory(raw: string | null | undefined, category: string | null | undefined): string {
  if (raw == null || raw === "") return "";
  const cat = (category ?? "").toLowerCase();
  const n = Number(raw);
  const isFinanceCategory = FINANCE_CATEGORIES.some((s) => cat.includes(s));

  if (Number.isNaN(n)) {
    // not numeric — try as a date, else pass through as text
    const d = new Date(raw);
    if (!isNaN(d.getTime()) && /date|start|completion|consent|let/.test(cat)) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
    }
    return raw;
  }

  if (cat.includes("nia")) return `${Math.round(n).toLocaleString("en-GB")} sq.ft`;
  if (isFinanceCategory && n === 0) return "n/a";
  if (DATE_CATEGORIES.test(cat)) {
    // Excel serial-ish or year-fraction date value
    const base = new Date(1900, 0, 1);
    base.setDate(base.getDate() + n - 1);
    return base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  }
  if (VOID_CATEGORIES.test(cat)) return `${Math.round(n)} months`;
  if (cat.includes("£psf")) return `${fmtGBP(n)} psf`;
  if (Math.abs(n) < 1 && Math.abs(n) > 0) return `${(n * 100).toFixed(2)}%`;
  return fmtGBP(n);
}

/**
 * Category-driven formatter for the Business Plan vs Current table's
 * Difference column specifically. Unlike Target/Current Expectation, a date
 * category's difference is a day-count delta, not a date — the source DAX
 * renders it as "X months" (DiffVal / (365/12)), never re-interprets it as a
 * calendar date.
 */
export function formatDifferenceByCategory(raw: string | null | undefined, category: string | null | undefined): string {
  if (raw == null || raw === "") return "";
  const cat = (category ?? "").toLowerCase();
  const n = Number(raw);
  const isFinanceCategory = FINANCE_CATEGORIES.some((s) => cat.includes(s));
  const isDateish = DATE_CATEGORIES.test(cat) || /\bdate\b|planning|start|completion/.test(cat);

  if (Number.isNaN(n)) return raw;

  if (n === 0 && isFinanceCategory) return "-";
  if (n === 0 && (isDateish || VOID_CATEGORIES.test(cat))) return "0 months";
  if (n === 0 && cat.includes("nia")) return "0 sq.ft";
  if (VOID_CATEGORIES.test(cat)) return `${Math.round(n)} months`;
  if (isDateish) return `${Math.round(n / (365 / 12)).toLocaleString("en-GB")} months`;
  if (cat.includes("nia")) return `${Math.round(n).toLocaleString("en-GB")} sq.ft`;
  if (cat.includes("£psf")) return `${fmtGBP(n)} psf`;
  if (Math.abs(n) < 1 && Math.abs(n) > 0) return `${(n * 100).toFixed(2)}%`;
  return fmtGBP(n);
}
