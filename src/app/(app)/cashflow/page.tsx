import { getCashflowAssets, getCashflowData } from "@/lib/queries";
import { fmtGBP } from "@/lib/format";
import EntityPicker from "@/components/EntityPicker";

function CashflowTable({ title, years, rows }: { title: string; years: number[]; rows: { line: string; values: (number | null)[] }[] }) {
  if (!rows.length) return null;
  return (
    <div className="mb-8">
      <h3 className="caption caption-on-navy mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="sheet sheet-navy text-xs">
          <thead>
            <tr>
              <th className="text-left">Line</th>
              {years.map((y) => <th key={y}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.line}>
                <td className="text-left">{r.line}</td>
                {r.values.map((v, i) => <td key={i}>{fmtGBP(v ? v / 1_000_000 : v, { decimals: 2 })}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; asset?: string }>;
}) {
  const { partner, asset } = await searchParams;
  const assets = await getCashflowAssets({ partner });
  const selected = asset && assets.includes(asset) ? asset : undefined;
  const data = await getCashflowData(selected, { partner });

  return (
    <main className="navy-page min-h-[calc(100vh-4rem)] p-8">
      <div className="max-w-xs mb-8">
        <EntityPicker basePath="/cashflow" param="asset" options={["All", ...assets]} value={selected ?? "All"} label="Asset" dark />
      </div>

      {!data || data.years.length === 0 ? (
        <p className="text-sm caption-on-navy">No cashflow data uploaded yet.</p>
      ) : (
        <>
          <CashflowTable title="Capital" years={data.years} rows={data.capexRows} />
          <CashflowTable title="Income" years={data.years} rows={data.incomeRows} />
          <p className="text-xs caption-on-navy mt-2">Figures in £M.</p>
        </>
      )}
    </main>
  );
}
