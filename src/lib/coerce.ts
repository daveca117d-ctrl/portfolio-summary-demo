// Value coercion for messy Excel cells. Dates arrive as real dates, Excel serials,
// and year integers. Numbers arrive with stray currency/percent formatting.

/** Excel serial date epoch (1899-12-30 accounts for the Lotus 1900 leap-year bug). */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function coerceNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).replace(/[£$,%\s]/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Coerce to a JS Date, handling serials, ISO strings, and bare year integers. */
export function coerceDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === "number") {
    if (raw >= 1900 && raw <= 2100) return new Date(Date.UTC(raw, 0, 1));
    if (raw > 20000 && raw < 80000) return new Date(EXCEL_EPOCH + raw * 86400000);
    return null;
  }

  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return new Date(Date.UTC(+s, 0, 1));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Best-effort 4-digit year from any date-ish or numeric value. */
export function coerceYear(raw: unknown): number | null {
  if (typeof raw === "number" && raw >= 1900 && raw <= 2100) return Math.trunc(raw);
  const d = coerceDate(raw);
  if (d) return d.getUTCFullYear();
  const m = String(raw ?? "").match(/(19|20)\d{2}/);
  return m ? +m[0] : null;
}

/**
 * For columns that are semantically numeric (a serial date, a day-count, a
 * percentage) but whose cells sometimes carry Excel date formatting — with
 * `cellDates: true`, XLSX then hands back a JS Date instead of a number for
 * those rows, even though the value should stay a plain number (mirrors
 * Power BI's own `VALUE()` call on these same source columns). Converts a
 * Date back to its Excel serial number; passes numbers/strings through as text.
 */
export function coerceMixedNumeric(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return String(Math.round((raw.getTime() - EXCEL_EPOCH) / 86400000));
  }
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

export function coerceString(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s+/g, " ");
  if (s === "" || s === "0") return null;
  return s;
}

export function coerceBool(raw: unknown): boolean {
  if (raw == null) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}
