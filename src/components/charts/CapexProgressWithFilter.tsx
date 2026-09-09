"use client";
import { useState, useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

interface Row { date: string; category: string; spend: number; forecast: number; }

function quarterOf(dateStr: string) {
  const d = new Date(dateStr);
  const quarter = Math.floor(d.getMonth() / 3) + 1;
  const year = d.getFullYear();
  return { quarterLabel: `Qtr ${quarter}`, year, sortKey: year * 4 + quarter };
}

const AXIS = { fill: "var(--ink-50)", fontSize: 10 };

/** "Capex Progress" — a category filter (Development Cashflow categories)
 * driving a combined bar (period spend) + cumulative line (actual solid,
 * forecast dashed) chart, plus Incurred/Remaining/Total headline stats. A
 * white panel on the surrounding navy page, matching the source report. */
export default function CapexProgressWithFilter({ rows, categories }: { rows: Row[]; categories: string[] }) {
  const [category, setCategory] = useState("All");

  const { chartData, incurred, remaining, total } = useMemo(() => {
    const filtered = category === "All" ? rows : rows.filter((r) => r.category === category);
    const byQuarter = new Map<string, { spend: number; forecast: number; sortKey: number; quarterLabel: string; year: number }>();
    for (const r of filtered) {
      const { quarterLabel, year, sortKey } = quarterOf(r.date);
      const key = `${year}-${quarterLabel}`;
      const entry = byQuarter.get(key) ?? { spend: 0, forecast: 0, sortKey, quarterLabel, year };
      entry.spend += r.spend;
      entry.forecast += r.forecast;
      byQuarter.set(key, entry);
    }
    const sorted = Array.from(byQuarter.values()).sort((a, b) => a.sortKey - b.sortKey);
    const data: { quarterLabel: string; yearLabel: string; bar: number; actualCumulative: number | null; forecastCumulative: number }[] = [];
    let cumActual = 0, cumTotal = 0, lastActual = 0;
    let prevYear: number | null = null;
    for (const q of sorted) {
      const isActual = q.spend > 0;
      cumActual += q.spend;
      cumTotal += q.spend + q.forecast;
      if (isActual) lastActual = cumActual;
      data.push({
        quarterLabel: q.quarterLabel,
        yearLabel: q.year !== prevYear ? String(q.year) : "",
        bar: isActual ? q.spend : q.forecast,
        actualCumulative: isActual ? cumActual : null,
        forecastCumulative: cumTotal,
      });
      prevYear = q.year;
    }
    return { chartData: data, incurred: lastActual, remaining: cumTotal - lastActual, total: cumTotal };
  }, [rows, category]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-paper text-ink text-xs border border-rule rounded-sm px-3 py-2 outline-none"
        >
          <option value="All">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-8 text-right">
          <div>
            <div className="caption">Incurred</div>
            <div className="figure text-lg text-red">{fmtGBPCompact(incurred)}</div>
          </div>
          <div>
            <div className="caption">Remaining</div>
            <div className="figure text-lg text-red">{fmtGBPCompact(remaining)}</div>
          </div>
          <div>
            <div className="caption">Total</div>
            <div className="figure text-lg text-red">{fmtGBPCompact(total)}</div>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--rule)" />
          <XAxis dataKey="quarterLabel" tick={AXIS} axisLine={{ stroke: "var(--rule)" }} tickLine={false} interval={0} />
          <XAxis dataKey="yearLabel" xAxisId="year" tick={{ ...AXIS, fontWeight: 500 }} axisLine={false} tickLine={false} interval={0} tickMargin={4} />
          <YAxis yAxisId="bar" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
          <YAxis yAxisId="line" orientation="right" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
          <Tooltip
            formatter={(v) => fmtGBPCompact(Number(v))}
            contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--ink-50)" }} />
          <Bar yAxisId="bar" dataKey="bar" name="Spend" fill="var(--ink-30)" isAnimationActive={false} />
          <Line yAxisId="line" type="monotone" dataKey="actualCumulative" name="Actual (cumulative)" stroke="var(--red)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line yAxisId="line" type="monotone" dataKey="forecastCumulative" name="Forecast (cumulative)" stroke="var(--red)" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
