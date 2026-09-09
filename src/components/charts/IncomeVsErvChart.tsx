"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

const AXIS = { stroke: "var(--ink-30)", fontSize: 11 };

export default function IncomeVsErvChart({
  data,
  height = 200,
}: {
  data: { year: number; income: number | null; incomeForecast: number | null; erv: number | null; ervForecast: number | null }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: "var(--rule)" }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
        <Tooltip formatter={(v) => fmtGBPCompact(Number(v))} contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line name="Income" type="monotone" dataKey="income" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line name="Income (forecast)" type="monotone" dataKey="incomeForecast" stroke="var(--ink-30)" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line name="ERV" type="monotone" dataKey="erv" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line name="ERV (forecast)" type="monotone" dataKey="ervForecast" stroke="var(--chart-2)" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
