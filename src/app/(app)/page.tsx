import { getHomeData, type HomePanel } from "@/lib/queries";
import { fmtGBPCompact, fmtPct, fmtSqft, fmtNumber } from "@/lib/format";
import CategoryPie from "@/components/charts/CategoryPie";
import CapitalPositionBars from "@/components/charts/CapitalPositionBars";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-ink-50">{label}</span>
      <span className="text-sm tnum font-medium">{value}</span>
    </div>
  );
}

function Panel({ title, panel, pieTitle }: { title: string; panel: HomePanel; pieTitle: string }) {
  const isDevelopment = title.toLowerCase().includes("development");
  return (
    <div className="panel p-6">
      <h2 className="section-title mb-4">{title}</h2>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <h3 className="caption !font-bold mb-2">Capital</h3>
          <Stat label="Committed Capital" value={fmtGBPCompact(panel.committedCapital)} />
          <Stat label={isDevelopment ? "GDV" : "Valuation"} value={fmtGBPCompact(panel.valuation)} />
          {!isDevelopment && (
            <Stat
              label="Capital Gain"
              value={`${fmtPct(panel.capitalGainPct)}  ${fmtGBPCompact(panel.capitalGainAmount)}`}
            />
          )}
          {isDevelopment && (
            <Stat label="Forecast Return" value={`${fmtPct(panel.forecastReturnPct)}  ${fmtGBPCompact(panel.capitalGainAmount)}`} />
          )}
        </div>
        <div>
          <h3 className="caption !font-bold mb-2">Income Position</h3>
          {!isDevelopment ? (
            <>
              <Stat label="Passing Income" value={fmtGBPCompact(panel.passingIncome)} />
              <Stat label="ERV" value={fmtGBPCompact(panel.erv)} />
              <Stat label="NOI to Date" value={fmtGBPCompact(panel.noiToDate)} />
              <Stat label="See Through Rent" value={fmtGBPCompact(panel.seeThroughRent)} />
            </>
          ) : (
            <>
              <Stat label="Forecast ERV" value={fmtGBPCompact(panel.erv)} />
              <Stat label="Development Yield" value={fmtPct(panel.developmentYieldPct, 1)} />
            </>
          )}
        </div>
        <div>
          <h3 className="caption !font-bold mb-2">Asset Headlines</h3>
          <Stat label="No. of Assets" value={fmtNumber(panel.assetCount)} />
          {!isDevelopment ? (
            <>
              <Stat label="No. of Tenants" value={fmtNumber(panel.tenantCount)} />
              <Stat label="Occupancy" value={fmtPct(panel.occupancyPct)} />
              <Stat label="WAULT (Expiry)" value={fmtNumber(panel.waultYears, 1)} />
            </>
          ) : (
            <Stat label="Proposed NIA (sq.ft)" value={fmtSqft(panel.proposedNIA)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="caption mb-2">{pieTitle}</h3>
          <CategoryPie data={panel.portfolioPie} height={200} />
        </div>
        <div>
          <h3 className="caption mb-2">Capital Position</h3>
          <CapitalPositionBars bars={panel.capitalPositionBars} height={160} />
        </div>
      </div>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const { partner } = await searchParams;
  const data = await getHomeData({ partner });

  if (!data) {
    return (
      <main className="p-8">
        <p className="text-sm text-ink-50">
          No data uploaded yet. Go to <a href="/update" className="underline">Update data</a> to import the portfolio workbook.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Panel title="Stabilised Assets" panel={data.stabilised} pieTitle="Portfolio by Valuation" />
        <Panel title="Development Assets" panel={data.development} pieTitle="Development by GDV" />
      </div>
    </main>
  );
}
