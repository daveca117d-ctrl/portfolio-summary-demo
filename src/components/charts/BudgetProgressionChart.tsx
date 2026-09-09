"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
  "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)", "var(--chart-10)",
];

interface Row { date: string; category: string; spend: number; forecast: number; }

/** "Budget Progression" — cumulative spend stacked by category over time,
 * with a multi-select category filter (checklist, mirroring the source
 * report's "Select all" + per-category dropdown). */
export default function BudgetProgressionChart({ rows, categories }: { rows: Row[]; categories: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(categories));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeCategories = categories.filter((c) => selected.has(c));

  const chartData = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.date.slice(0, 7)))).sort();
    const cumByCat = new Map<string, number>(activeCategories.map((c) => [c, 0]));
    return months.map((month) => {
      const point: Record<string, string | number> = { month };
      for (const cat of activeCategories) {
        const spend = rows
          .filter((r) => r.date.slice(0, 7) === month && r.category === cat)
          .reduce((a, r) => a + r.spend + r.forecast, 0);
        cumByCat.set(cat, (cumByCat.get(cat) ?? 0) + spend);
        point[cat] = cumByCat.get(cat) ?? 0;
      }
      return point;
    });
  }, [rows, activeCategories]);

  function toggle(cat: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === categories.length ? new Set() : new Set(categories)));
  }

  return (
    <div>
      <div ref={ref} className="relative inline-block mb-4" style={{ minWidth: 160 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between gap-3 border border-rule px-3 py-2 text-xs font-bold uppercase tracking-wide bg-paper"
        >
          {selected.size === categories.length ? "All" : `${selected.size} selected`}
          <span className="text-ink-50">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="absolute z-10 mt-1 border border-rule bg-paper shadow-md max-h-64 overflow-y-auto" style={{ minWidth: 300 }}>
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-cream-tint border-b border-rule">
              <input type="checkbox" checked={selected.size === categories.length} onChange={toggleAll} />
              Select all
            </label>
            {categories.map((c) => (
              <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-cream-tint">
                <input type="checkbox" checked={selected.has(c)} onChange={() => toggle(c)} />
                {c}
              </label>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--rule)" />
          <XAxis dataKey="month" tick={{ fill: "var(--ink-50)", fontSize: 10 }} axisLine={{ stroke: "var(--rule)" }} tickLine={false} minTickGap={30} />
          <YAxis tick={{ fill: "var(--ink-50)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
          <Tooltip formatter={(v) => fmtGBPCompact(Number(v))} contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }} />
          {activeCategories.map((c, i) => (
            <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div
        className="grid gap-x-4 gap-y-1.5 mt-3 text-xs text-ink-50"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
      >
        {activeCategories.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5 min-w-0">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{c}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
