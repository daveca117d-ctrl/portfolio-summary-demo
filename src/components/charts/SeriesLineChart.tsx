"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmtGBPCompact, fmtPct } from "@/lib/format";

const AXIS = { stroke: "var(--ink-30)", fontSize: 11 };

export default function SeriesLineChart({
  data,
  mode = "currency",
  height = 200,
}: {
  data: { year: number; actual: number | null; forecast: number | null }[];
  mode?: "currency" | "percent";
  height?: number;
}) {
  const fmt = mode === "percent" ? (v: number) => fmtPct(v, 1) : fmtGBPCompact;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: "var(--rule)" }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} width={56} />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line type="monotone" dataKey="forecast" stroke="var(--series-forecast)" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
