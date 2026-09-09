"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

const AXIS = { stroke: "var(--ink-30)", fontSize: 11 };

export default function RentAtRiskChart({
  data,
  height = 220,
}: {
  data: { year: number; contracted: number; erv: number; expiryValue: number; breakValue: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: "var(--rule)" }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtGBPCompact(v)} width={56} />
        <Tooltip formatter={(v) => fmtGBPCompact(Number(v))} contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar name="Contracted income" dataKey="contracted" fill="var(--ink)" isAnimationActive={false} />
        <Bar name="ERV" dataKey="erv" fill="var(--chart-2)" isAnimationActive={false} />
        <Bar name="Expiry income" dataKey="expiryValue" fill="var(--red-dark)" isAnimationActive={false} />
        <Bar name="Break income" dataKey="breakValue" fill="var(--red-light)" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
