"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

const AXIS = { stroke: "var(--ink-30)", fontSize: 11 };

/** Development capex-progress: cumulative actual spend (stops at last complete
 * month) vs cumulative forecast spend (runs to projected completion). */
export default function CapexProgressChart({
  data,
  height = 240,
}: {
  data: { date: string; actualCumulative: number | null; forecastCumulative: number | null }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <XAxis
          dataKey="date"
          tick={AXIS}
          axisLine={{ stroke: "var(--rule)" }}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(0, 7)}
          minTickGap={40}
        />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
        <Tooltip formatter={(v) => fmtGBPCompact(Number(v))} contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line name="Actual (cumulative)" type="monotone" dataKey="actualCumulative" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line name="Forecast (cumulative)" type="monotone" dataKey="forecastCumulative" stroke="var(--series-forecast)" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
