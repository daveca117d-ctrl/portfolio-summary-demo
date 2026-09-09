import { Fragment } from "react";
import { getDevelopmentAssets, getDevelopmentDetail } from "@/lib/queries";
import { fmtGBPCompact, fmtPct, fmtSqft, fmtDate, formatByCategory, formatDifferenceByCategory } from "@/lib/format";
import EntityPicker from "@/components/EntityPicker";
import CapexProgressWithFilter from "@/components/charts/CapexProgressWithFilter";
import BudgetProgressionChart from "@/components/charts/BudgetProgressionChart";
import { DEV_SECTIONS } from "@/lib/devSections";

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 border-b border-rule/60 ${highlight ? "stat-highlight" : ""}`}>
      <span className="text-xs text-ink-50">{label}</span>
      <span className="text-sm tnum font-medium text-right">{value}</span>
    </div>
  );
}

function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="caption mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default async function DevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; asset?: string }>;
}) {
  const { partner, asset: assetParam } = await searchParams;
  const assets = await getDevelopmentAssets({ partner });
  const selected = assetParam && assets.includes(assetParam) ? assetParam : assets[0];

  if (!selected) {
    return (
      <main className="p-8">
        <p className="text-sm text-ink-50">No development assets found for the current filter.</p>
      </main>
    );
  }

  const detail = await getDevelopmentDetail(selected);
  if (!detail) return null;
  const { asset, planRows, tenancySchedule, cashflowRows, cashflowCategories } = detail;

  const summaryRow = planRows.find((r) => !r.category && r.developmentSummary);
  const categoryRows = planRows.filter((r) => r.category);
  const grouped = DEV_SECTIONS.map((section) => ({
    ...section,
    rows: categoryRows.filter((r) => section.categories.includes(r.category ?? "")),
  })).filter((s) => s.rows.length);
  const otherRows = categoryRows.filter((r) => !DEV_SECTIONS.some((s) => s.categories.includes(r.category ?? "")));

  // "Projected Stabilisation" sidebar figures come from the Current Appraisal
  // column of specific Business Plan vs Current rows, not from Asset fields.
  const planCurrentNum = (category: string) => {
    const raw = categoryRows.find((r) => r.category === category)?.currentExpectation;
    const n = raw != null ? Number(raw) : null;
    return n != null && Number.isFinite(n) ? n : null;
  };
  const planCurrentFmt = (category: string) => {
    const row = categoryRows.find((r) => r.category === category);
    return row ? formatByCategory(row.currentExpectation, row.category) || "—" : "—";
  };

  const totalCost = planCurrentNum("Total Cost");
  const marketSalePrice = summaryRow?.marketSalePrice ?? planCurrentNum("Market Sale Price");
  const developmentCapex = planCurrentNum("Total Development Capex");
  // Development assets don't carry a stabilised ERV/yield on the Asset row
  // yet (pre-letting) — the projected figures live on the appraisal instead.
  const projectedErv = planCurrentNum("ERV");
  const projectedYieldOnCost = planCurrentNum("Gross Stabilised Yield");

  const niaUplift = asset?.proposedNIA && asset?.acquisitionNIA != null ? asset.proposedNIA - asset.acquisitionNIA : null;
  const netGrossAcq = asset?.acquisitionNIA && asset?.acquisitionGIA ? asset.acquisitionNIA / asset.acquisitionGIA : null;
  const netGrossProposed = asset?.proposedNIA && asset?.proposedGIA ? asset.proposedNIA / asset.proposedGIA : null;
  const psfOnExistNIA = asset?.marketPP && asset?.acquisitionNIA ? asset.marketPP / asset.acquisitionNIA : null;
  const psfOnPropNIA = asset?.marketPP && asset?.proposedNIA ? asset.marketPP / asset.proposedNIA : null;
  const constructionCostPsfGIA = asset?.constructionCost && asset?.proposedGIA ? asset.constructionCost / asset.proposedGIA : null;
  const devCostPsfGIA = developmentCapex && asset?.proposedGIA ? developmentCapex / asset.proposedGIA : null;
  const devCostPsfNIA = developmentCapex && asset?.proposedNIA ? developmentCapex / asset.proposedNIA : null;
  const totalCostPsfGIA = totalCost && asset?.proposedGIA ? totalCost / asset.proposedGIA : null;
  const totalCostPsfNIA = totalCost && asset?.proposedNIA ? totalCost / asset.proposedNIA : null;
  const marketSalePsfNIA = marketSalePrice && asset?.proposedNIA ? marketSalePrice / asset.proposedNIA : null;
  const projectedProfit = asset?.projectedGDV != null && asset?.currentCapitalCommitment != null
    ? asset.projectedGDV - asset.currentCapitalCommitment
    : null;

  const psf = (v: number | null) => v != null ? `£${Math.round(v).toLocaleString("en-GB")} psf` : "—";

  return (
    <main className="p-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
      {/* Left sidebar: picker + image + Acquisition/Development/Projected Stabilisation.
          Spans the full page height (its own column), independent of how tall the
          right column's content is — it stays on the light page background even
          once the right column switches to navy further down. */}
      <div className="space-y-5">
        <EntityPicker basePath="/development" param="asset" options={assets} value={selected} label="Asset" />

          {asset?.image && (
            // eslint-disable-next-line @next/next/no-img-element -- external per-asset URLs from many domains
            <img src={asset.image} alt={asset.address} className="w-full aspect-[4/3] object-cover rounded-sm" />
          )}

          <SidebarGroup title="Acquisition">
            <Stat label="Purchase Date" value={fmtDate(asset?.purchaseDate)} />
            <Stat label="Purchase Price" value={fmtGBPCompact(asset?.marketPP)} />
            <Stat label="£psf on Exist NIA" value={psf(psfOnExistNIA)} />
            <Stat label="£psf on Prop NIA" value={psf(psfOnPropNIA)} />
            <Stat label="Acquired NIA" value={fmtSqft(asset?.acquisitionNIA)} />
            <Stat label="Acquired GIA" value={fmtSqft(asset?.acquisitionGIA)} />
            <Stat label="Net:Gross" value={fmtPct(netGrossAcq)} />
            <Stat label="Vendor" value={asset?.vendor ?? "—"} />
          </SidebarGroup>

          <SidebarGroup title="Development">
            <Stat label="Proposed GIA" value={fmtSqft(asset?.proposedGIA)} />
            <Stat label="Proposed NIA" value={fmtSqft(asset?.proposedNIA)} />
            <Stat label="NIA Uplift (sq.ft)" value={fmtSqft(niaUplift)} />
            <Stat label="Proposed Net:Gross" value={fmtPct(netGrossProposed)} />
            <Stat label="Construction Cost" value={fmtGBPCompact(asset?.constructionCost)} />
            <Stat label="£psf (GIA)" value={psf(constructionCostPsfGIA)} />
            <Stat label="Development Cost" value={fmtGBPCompact(developmentCapex)} />
            <Stat label="£psf (GIA)" value={psf(devCostPsfGIA)} />
            <Stat label="£psf (NIA)" value={psf(devCostPsfNIA)} />
            <Stat label="PC Date" value={fmtDate(asset?.practicalCompletionDate ?? summaryRow?.projectedPC)} />
          </SidebarGroup>

          <SidebarGroup title="Projected Stabilisation">
            <Stat label="Total Cost" value={fmtGBPCompact(totalCost)} />
            <Stat label="£psf (GIA)" value={psf(totalCostPsfGIA)} />
            <Stat label="£psf (NIA)" value={psf(totalCostPsfNIA)} />
            <Stat label="Market Sale Price" value={fmtGBPCompact(marketSalePrice)} />
            <Stat label="£psf (NIA)" value={psf(marketSalePsfNIA)} />
            <Stat label="Profit inc. Income" value={planCurrentFmt("Total Profit")} />
            <Stat label="Profit on Cost" value={planCurrentFmt("Profit on Cost/Equity")} />
            <Stat label="Stabilised Yield" value={planCurrentFmt("Gross Stabilised Yield")} />
            <Stat label="Exit Yield" value={planCurrentFmt("Exit Yield")} />
          </SidebarGroup>
      </div>

      {/* Right column: headlines (light bg) then Capex Progress / tables / Budget
          Progression (navy bg) — this whole column flows independently of the
          sidebar's height, so the navy zone starts right after the headlines,
          not after wherever the sidebar happens to end. */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-6 items-stretch">
          <div className="panel p-5">
            <h3 className="section-title mb-3">Capital Position</h3>
            <Stat label="Purchase Price" value={fmtGBPCompact(asset?.marketPP)} />
            <Stat label="Current Budget" value={fmtGBPCompact(asset?.capexDuringHoldBudget)} />
            <Stat label="Forecast Com Capital" value={fmtGBPCompact(asset?.currentCapitalCommitment)} highlight />
            <Stat label="Outstanding Debt" value={fmtGBPCompact(asset?.currentDebtOutstanding)} />
            <Stat label="Equity Commitment" value={fmtGBPCompact(asset?.currentEquityCommitment)} />
            <Stat label="Projected NDV" value={fmtGBPCompact(asset?.projectedGDV)} highlight />
            <Stat label="Projected Profit" value={fmtGBPCompact(projectedProfit)} />

            <h3 className="section-title mb-3 mt-5">Income Position</h3>
            <Stat label="Projected ERV p.a." value={fmtGBPCompact(projectedErv ?? asset?.ervPa)} />
            <Stat label="Projected Yield on Cost" value={fmtPct(projectedYieldOnCost ?? asset?.yieldOnCostForecast, 1)} highlight />
            <Stat label="% Let" value={fmtPct(summaryRow?.pctLet)} />
            <Stat label="Contracted Income" value={fmtGBPCompact(summaryRow?.contractedIncome)} />
          </div>

          <div className="panel p-5">
            <h3 className="section-title mb-3">Status</h3>
            <Stat label="Stage" value={summaryRow?.stage ?? "—"} />
            <Stat label="Projected NIA" value={fmtSqft(asset?.proposedNIA)} highlight />
            <Stat label="NIA Uplift" value={fmtSqft(niaUplift)} />
            <Stat label="Projected PC" value={fmtDate(summaryRow?.projectedPC)} />
            <Stat label="Projected Stabilisation" value={fmtDate(summaryRow?.projectedStabilisation)} />
          </div>

          <div className="panel-accent p-5">
            <h3 className="section-title mb-3">Development Summary</h3>
            {summaryRow?.developmentSummary ? (
              <p className="text-sm leading-relaxed text-ink-70 whitespace-pre-wrap">{summaryRow.developmentSummary}</p>
            ) : (
              <p className="text-sm text-ink-50 text-center pt-8">(Blank)</p>
            )}
          </div>
        </div>

        {/* Dark-navy zone: Capex Progress, Business Plan / NIA tables, Budget Progression —
            all white panels floating on the navy page background, scoped to this
            right column only (the sidebar stays light the whole way down). */}
        <div className="navy-page p-8 mt-8 rounded-sm space-y-8">
        <div className="panel p-5">
          <h3 className="section-title mb-4">Capex Progress — Excluding Letting Costs</h3>
          <CapexProgressWithFilter rows={cashflowRows} categories={cashflowCategories} />
        </div>

        <div className="panel p-5">
          <h3 className="section-title mb-3">Business Plan vs Current Appraisal</h3>
          <div className="overflow-x-auto">
            <table className="sheet text-xs">
              <thead>
                <tr>
                  <th className="text-left">Category</th>
                  <th>Business Plan</th>
                  <th>Current Appraisal</th>
                  <th>Difference</th>
                  <th className="!text-left">Comment</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((section) => (
                  <Fragment key={section.title}>
                    <tr>
                      <td colSpan={5} className="!text-left bg-cream-active text-ink font-bold uppercase tracking-wide py-2">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="text-left">{r.category}</td>
                        <td>{formatByCategory(r.target, r.category)}</td>
                        <td>{formatByCategory(r.currentExpectation, r.category)}</td>
                        <td>{formatDifferenceByCategory(r.difference, r.category)}</td>
                        <td className="!text-left">{r.comment ?? ""}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {otherRows.length > 0 && (
                  <Fragment>
                    <tr>
                      <td colSpan={5} className="!text-left bg-cream-active text-ink font-bold uppercase tracking-wide py-2">Other</td>
                    </tr>
                    {otherRows.map((r) => (
                      <tr key={r.id}>
                        <td className="text-left">{r.category}</td>
                        <td>{formatByCategory(r.target, r.category)}</td>
                        <td>{formatByCategory(r.currentExpectation, r.category)}</td>
                        <td>{formatDifferenceByCategory(r.difference, r.category)}</td>
                        <td className="!text-left">{r.comment ?? ""}</td>
                      </tr>
                    ))}
                  </Fragment>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {tenancySchedule.length > 0 && (
          <div className="panel p-5">
            <h3 className="section-title mb-3">NIA & Rent Roll: Business Plan vs Current Appraisal</h3>
            <div className="overflow-x-auto">
              <table className="sheet text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Demise</th>
                    <th>Target NIA</th><th>Appraisal NIA</th><th>Sq.ft Diff</th>
                    <th>Target £psf</th><th>Appraisal £psf</th><th>£psf Diff</th>
                    <th>Target Rent p.a</th><th>Appraisal Rent p.a</th><th>Rent Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {tenancySchedule.map((r) => (
                    <tr key={r.id}>
                      <td className="text-left">{r.demise ?? "—"}</td>
                      <td>{fmtSqft(r.targetNIA)}</td>
                      <td>{fmtSqft(r.currentExpectationNIA)}</td>
                      <td className="text-chart-2 font-medium">{fmtSqft(r.sqftDifference)}</td>
                      <td>{r.targetPsf != null ? `£${r.targetPsf.toFixed(0)}` : "—"}</td>
                      <td>{r.currentExpectationPsf != null ? `£${r.currentExpectationPsf.toFixed(0)}` : "—"}</td>
                      <td className="text-chart-2 font-medium">{r.psfDifference != null ? `£${r.psfDifference.toFixed(0)}` : "—"}</td>
                      <td>{fmtGBPCompact(r.targetRentPa)}</td>
                      <td>{fmtGBPCompact(r.currentExpectationRentPa)}</td>
                      <td className="text-chart-2 font-medium">{fmtGBPCompact(r.rentPaDifference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {cashflowCategories.length > 0 && (
          <div className="panel p-5">
            <h3 className="section-title mb-3">Budget Progression</h3>
            <BudgetProgressionChart rows={cashflowRows} categories={cashflowCategories} />
            <p className="text-xs text-ink-50 mt-2">Cumulative spend by cost category, actual + forecast.</p>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
