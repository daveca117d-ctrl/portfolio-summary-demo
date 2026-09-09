"use client";
import { useState, useRef, useEffect } from "react";
import SeriesLineChart from "./SeriesLineChart";

const OPTIONS = [
  { key: "CAPITAL EXPENDITURE", label: "Capital Expenditure" },
  { key: "COMMITTED CAPITAL", label: "Committed Capital" },
  { key: "COMMITTED EQUITY", label: "Committed Equity" },
  { key: "ERV", label: "ERV" },
  { key: "INCOME", label: "Income" },
  { key: "NOI", label: "NOI" },
  { key: "OPEX", label: "OPEX" },
  { key: "YEAR END VALUATION", label: "Year End Valuation" },
] as const;

type Series = { year: number; actual: number | null; forecast: number | null }[];

/** "Historic & Forecasted Property Information" — one chart, metric chosen
 * via a dropdown, matching the source report's selector rather than a fixed
 * chart per metric. */
export default function MetricSelectChart({ series }: { series: Record<string, Series> }) {
  const [selected, setSelected] = useState<string>(OPTIONS[0].key);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = OPTIONS.find((o) => o.key === selected)?.label ?? selected;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div>
      <div ref={ref} className="relative inline-block mb-4" style={{ minWidth: 220 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 border border-rule px-3 py-2 text-xs font-bold uppercase tracking-wide bg-paper"
        >
          {label}
          <span className="text-ink-50">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full border border-rule bg-paper shadow-md">
            {OPTIONS.map((o) => (
              <label
                key={o.key}
                className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wide cursor-pointer hover:bg-cream-tint"
              >
                <input
                  type="radio"
                  name="metric"
                  checked={selected === o.key}
                  onChange={() => {
                    setSelected(o.key);
                    setOpen(false);
                  }}
                />
                {o.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <SeriesLineChart data={series[selected] ?? []} height={240} />
    </div>
  );
}
