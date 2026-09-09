"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtGBPCompact } from "@/lib/format";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
  "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)", "var(--chart-10)",
];

// Label the biggest slices (by value — data arrives pre-sorted descending);
// beyond this count it gets unreadable, so the remainder are still available
// on hover via the tooltip rather than cluttering the chart.
const MAX_LABELS = 7;

const RADIAN = Math.PI / 180;
const LABEL_BOX_WIDTH = 130;
const LABEL_BOX_HEIGHT = 34;

interface LabelProps {
  cx?: number; cy?: number; midAngle?: number; outerRadius?: number; percent?: number; name?: string; index?: number;
}

function TooltipContent({ active, payload, total }: { active?: boolean; payload?: { name: string; value: number }[]; total: number }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--rule)", fontSize: 12, padding: "6px 10px" }}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div>{fmtGBPCompact(value)} · {pct.toFixed(0)}%</div>
    </div>
  );
}

export default function CategoryPie({
  data,
  height = 340,
  maxSlices = 10,
}: {
  data: { name: string; value: number }[];
  height?: number;
  maxSlices?: number;
}) {
  const top = data.slice(0, maxSlices);
  const rest = data.slice(maxSlices);
  const restTotal = rest.reduce((a, d) => a + d.value, 0);
  const chartData = restTotal > 0 ? [...top, { name: "Other", value: restTotal }] : top;
  const total = chartData.reduce((a, d) => a + d.value, 0);

  // Recharts pie labels are plain SVG <text> — they can't wrap. A foreignObject
  // with a normal <div> gives real CSS word-wrapping so longer names don't
  // clip at the panel edge.
  function renderLabel(props: LabelProps) {
    const index = props.index ?? 0;
    if (index >= MAX_LABELS) return null;

    const cx = props.cx ?? 0, cy = props.cy ?? 0, midAngle = props.midAngle ?? 0;
    const outerRadius = props.outerRadius ?? 0, percent = props.percent ?? 0, name = props.name ?? "";
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const mx = cx + (outerRadius + 12) * cos;
    const my = cy + (outerRadius + 12) * sin;
    const isRight = cos >= 0;
    const x = isRight ? mx : mx - LABEL_BOX_WIDTH;
    const y = my - LABEL_BOX_HEIGHT / 2;

    return (
      <g>
        <line x1={sx} y1={sy} x2={mx} y2={my} stroke="var(--ink-30)" strokeWidth={1} />
        <foreignObject x={x} y={y} width={LABEL_BOX_WIDTH} height={LABEL_BOX_HEIGHT}>
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.3,
              color: "var(--ink-70)",
              textAlign: isRight ? "left" : "right",
              overflowWrap: "break-word",
            }}
          >
            {name} — {(percent * 100).toFixed(0)}%
          </div>
        </foreignObject>
      </g>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 40, right: 20, bottom: 40, left: 20 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="72%"
          isAnimationActive={false}
          label={renderLabel}
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--paper)" strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip content={<TooltipContent total={total} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
