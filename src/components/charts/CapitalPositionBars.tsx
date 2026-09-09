import { fmtGBPCompact } from "@/lib/format";

const STACK_COLORS = ["var(--series-acquisition)", "var(--series-capex)", "var(--chart-6)"];
const TERMINAL_NAMES = ["valuation", "gdv"];

/**
 * Flat-rectangle bar pair matching the source report's "Capital Position"
 * visual: everything except the terminal legend (Valuation / GDV) stacks into
 * one bar, the terminal legend stands alone as a second solid bar.
 */
export default function CapitalPositionBars({
  bars,
  height = 180,
}: {
  bars: { legend: string; value: number }[];
  height?: number;
}) {
  const terminal = bars.find((b) => TERMINAL_NAMES.includes(b.legend.toLowerCase()));
  const stackItems = bars.filter((b) => b !== terminal);
  const stackTotal = stackItems.reduce((a, b) => a + b.value, 0);
  const maxValue = Math.max(stackTotal, terminal?.value ?? 0, 1);

  if (!bars.length) {
    return <div className="text-xs text-ink-50" style={{ height }}>No data</div>;
  }

  return (
    <div>
      <div className="flex items-end justify-center gap-6" style={{ height }}>
        <div className="flex flex-col items-center justify-end h-full w-20">
          <div className="text-xs tnum mb-1">{fmtGBPCompact(stackTotal)}</div>
          <div className="w-full flex flex-col-reverse" style={{ height: `${(stackTotal / maxValue) * 100}%` }}>
            {stackItems.map((item, i) => (
              <div
                key={item.legend}
                className="w-full flex items-start justify-center"
                style={{
                  flex: item.value,
                  background: STACK_COLORS[i % STACK_COLORS.length],
                  minHeight: item.value > 0 ? 2 : 0,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-end h-full w-20">
          <div className="text-xs tnum mb-1">{fmtGBPCompact(terminal?.value)}</div>
          <div
            className="w-full"
            style={{
              height: `${((terminal?.value ?? 0) / maxValue) * 100}%`,
              background: "var(--series-valuation)",
              minHeight: 2,
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-ink-50">
        {stackItems.map((item, i) => (
          <span key={item.legend} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STACK_COLORS[i % STACK_COLORS.length] }} />
            {item.legend}
          </span>
        ))}
        {terminal && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--series-valuation)" }} />
            {terminal.legend}
          </span>
        )}
      </div>
    </div>
  );
}
