import { getAssetAddresses, getAssetDetail } from "@/lib/queries";
import { fmtGBPCompact, fmtGBP, fmtPct, fmtSqft, fmtDate, fmtNumber } from "@/lib/format";
import EntityPicker from "@/components/EntityPicker";
import SeriesLineChart from "@/components/charts/SeriesLineChart";
import MetricSelectChart from "@/components/charts/MetricSelectChart";
import IncomeVsErvChart from "@/components/charts/IncomeVsErvChart";
import RentAtRiskChart from "@/components/charts/RentAtRiskChart";
import CategoryPie from "@/components/charts/CategoryPie";

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 border-b border-rule/60 ${highlight ? "stat-highlight" : ""}`}>
      <span className="text-xs text-ink-50">{label}</span>
      <span className="text-sm tnum font-medium text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <h3 className="section-title mb-3">{title}</h3>
      {children}
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

export default async function AssetManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; address?: string }>;
}) {
  const { partner, address } = await searchParams;
  const addresses = await getAssetAddresses({ partner });
  const selected = address && addresses.includes(address) ? address : addresses[0];

  if (!selected) {
    return (
      <main className="p-8">
        <p className="text-sm text-ink-50">
          No data uploaded yet. Go to <a href="/update" className="underline">Update data</a> to import the portfolio workbook.
        </p>
      </main>
    );
  }

  const detail = await getAssetDetail(selected);
  if (!detail) return null;
  const { asset } = detail;

  const yieldOnValuation = asset.passingRentAtValuation && asset.currentValuation
    ? asset.passingRentAtValuation / asset.currentValuation
    : asset.contractedRentPa && asset.currentValuation
    ? asset.contractedRentPa / asset.currentValuation
    : null;

  // Capital/Total/Income Return are £ gain amounts in the source, not ratios —
  // the source report's own measures divide by Current Capital Commitment.
  const capitalReturnPct = asset.capitalReturn && asset.currentCapitalCommitment
    ? asset.capitalReturn / asset.currentCapitalCommitment
    : null;
  const totalReturnPct = asset.totalReturn && asset.currentCapitalCommitment
    ? asset.totalReturn / asset.currentCapitalCommitment
    : null;

  // Derived ratios not stored directly on Asset.
  const netToGross = asset.currentNIA && asset.currentGIA ? asset.currentNIA / asset.currentGIA : null;
  const rentPsf = asset.contractedRentPa && asset.currentNIA ? asset.contractedRentPa / asset.currentNIA : null;
  const ervPsf = asset.ervPa && asset.currentNIA ? asset.ervPa / asset.currentNIA : null;
  const niaUplift = asset.proposedNIA && asset.acquisitionNIA != null ? asset.proposedNIA - asset.acquisitionNIA : null;
  const capexPsfNIA = asset.capexDuringHoldBudget && asset.currentNIA ? asset.capexDuringHoldBudget / asset.currentNIA : null;
  const constructionCostPsfGIA = asset.constructionCost && asset.proposedGIA ? asset.constructionCost / asset.proposedGIA : null;
  const valuationPsf = asset.valuationPsf ?? (asset.currentValuation && asset.currentNIA ? asset.currentValuation / asset.currentNIA : null);
  const netInitialYield = asset.contractedRentPa && asset.currentValuation ? asset.contractedRentPa / asset.currentValuation : null;

  const tenancyTotals = detail.tenancy.reduce<{ nia: number; rentPa: number; ervPa: number }>(
    (acc, t) => ({
      nia: acc.nia + (t.niaSqft ?? 0),
      rentPa: acc.rentPa + (t.rentPa ?? 0),
      ervPa: acc.ervPa + (t.ervPa ?? 0),
    }),
    { nia: 0, rentPa: 0, ervPa: 0 }
  );

  return (
    <main className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Left sidebar: picker + stacked field groups — sits on the plain page
            background (not boxed), matching the source report. */}
        <div className="space-y-5">
          <EntityPicker basePath="/asset-management" param="address" options={addresses} value={selected} />

          {asset.image && (
            // eslint-disable-next-line @next/next/no-img-element -- external, per-asset URLs from many domains; not worth next/image's remote-pattern config for an internal tool
            <img
              src={asset.image}
              alt={asset.address}
              className="w-full aspect-[4/3] object-cover rounded-sm"
            />
          )}

          <SidebarGroup title="Overview">
            <Stat label="Current NIA" value={fmtSqft(asset.currentNIA)} />
            <Stat label="Current GIA" value={fmtSqft(asset.currentGIA)} />
            <Stat label="Net:Gross" value={fmtPct(netToGross)} />
            <Stat label="Post Code" value={asset.postcode ?? "—"} />
            <Stat label="Tenure" value={asset.tenure ?? "—"} />
            <Stat label="EPC" value={asset.epc ?? "—"} />
          </SidebarGroup>

          <SidebarGroup title="Acquisition">
            <Stat label="Acquisition Date" value={fmtDate(asset.purchaseDate)} />
            <Stat label="Acquired NIA" value={fmtSqft(asset.acquisitionNIA)} />
            <Stat label="Acquired GIA" value={fmtSqft(asset.acquisitionGIA)} />
            <Stat label="Purchase Price" value={fmtGBPCompact(asset.marketPP)} />
            <Stat label="£psf on Existing" value={asset.marketPPPsf != null ? `£${Math.round(asset.marketPPPsf).toLocaleString("en-GB")} psf` : "—"} />
            <Stat label="NIY" value={fmtPct(asset.niy, 1)} />
            <Stat label="Annual Rent" value={fmtGBPCompact(asset.rentAtPurchase)} />
            <Stat label="Vendor" value={asset.vendor ?? "—"} />
          </SidebarGroup>

          <SidebarGroup title="Development">
            <Stat label="Design Start" value={fmtDate(asset.designStartDate)} />
            <Stat label="Construction Start" value={fmtDate(asset.developmentStartDate)} />
            <Stat label="Construction End" value={fmtDate(asset.developmentCompletionDate)} />
            <Stat label="Construction Duration" value={asset.durationYears != null ? `${fmtNumber(asset.durationYears * 12)} months` : "—"} />
            <Stat label="Capex" value={fmtGBPCompact(asset.capexDuringHoldBudget)} />
            <Stat label="£psf Proposed (GIA)" value={constructionCostPsfGIA != null ? `£${Math.round(constructionCostPsfGIA).toLocaleString("en-GB")} psf` : "—"} />
            <Stat label="NIA Uplift" value={fmtSqft(niaUplift)} />
            <Stat label="Total Committed Capital" value={fmtGBPCompact(asset.currentCapitalCommitment)} />
            <Stat label="Cost £psf (NIA)" value={capexPsfNIA != null ? `£${Math.round(capexPsfNIA).toLocaleString("en-GB")} psf` : "—"} />
          </SidebarGroup>

          <SidebarGroup title="Stabilisation">
            <Stat label="Contracted Rent" value={fmtGBPCompact(asset.contractedRentPa)} />
            <Stat label="Rent £psf" value={rentPsf != null ? `£${rentPsf.toFixed(2)} psf` : "—"} />
            <Stat label="ERV p.a." value={fmtGBPCompact(asset.ervPa)} />
            <Stat label="ERV £psf" value={ervPsf != null ? `£${ervPsf.toFixed(2)} psf` : "—"} />
          </SidebarGroup>

          <SidebarGroup title="Valuation">
            <Stat label="Valuation Date" value={fmtDate(asset.latestValuationDate)} />
            <Stat label="Total Valuation" value={fmtGBPCompact(asset.currentValuation)} />
            <Stat label="£psf" value={valuationPsf != null ? `£${Math.round(valuationPsf).toLocaleString("en-GB")} psf` : "—"} />
            <Stat label="Net Initial Yield" value={fmtPct(netInitialYield, 1)} />
            <Stat label="Equivalent Yield" value={fmtPct(asset.equivalentYield, 1)} />
          </SidebarGroup>

          <SidebarGroup title="Key Information">
            <Stat label="Partner" value={asset.partner ?? "—"} />
            <Stat label="Owner" value={asset.entity ?? "—"} />
            <Stat label="Property Manager" value={asset.partnerRepresentative ?? "—"} />
            <Stat label="Email" value={asset.receptionEmail ?? "—"} />
          </SidebarGroup>
        </div>

        {/* Main column */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-6">
            <Section title="Capital Position">
              <Stat label="Committed Equity" value={fmtGBPCompact(asset.currentEquityCommitment)} />
              <Stat label="Outstanding Debt" value={fmtGBPCompact(asset.currentDebtOutstanding)} />
              <Stat label="Committed Capital" value={fmtGBPCompact(asset.currentCapitalCommitment)} />
              <Stat label="Current Valuation" value={fmtGBPCompact(asset.currentValuation)} highlight />
              <Stat label="Capital Return" value={fmtPct(capitalReturnPct)} />
              <Stat label="NOI to Date" value={fmtGBPCompact(asset.noiToDate)} />
              <Stat label="Total Return" value={fmtPct(totalReturnPct)} highlight />
              <Stat label="Hold Period (Years)" value={fmtNumber(asset.holdPeriod, 1)} />
              <Stat label="Rolling IRR" value={fmtPct(asset.rollingIRR, 1)} />
            </Section>
            <Section title="Income Position">
              <Stat label="Passing Rent p.a." value={fmtGBPCompact(asset.contractedRentPa)} />
              <Stat label="Yield on Valuation" value={fmtPct(yieldOnValuation, 1)} highlight />
              <Stat label="Yield on Cost" value={fmtPct(asset.yieldOnCostForecast, 1)} />
              <Stat label="Headline ERV" value={fmtGBPCompact(asset.ervPa)} />
              <Stat label="See Through Rent" value={fmtGBPCompact(asset.stabilisedErvPa)} />
              <Stat label="Weighted Term (Years)" value={fmtNumber(asset.waut, 1)} />
              <Stat label="Weighted Term Certain" value={fmtNumber(asset.wautc, 1)} />
              <Stat label="Occupancy" value={fmtPct(asset.occupancy)} />
            </Section>
            <div className="panel-accent p-5">
              <h3 className="section-title mb-3">Acquisition Strategy and Business Plan</h3>
              {asset.execSum ? (
                <p className="text-sm leading-relaxed text-ink-70 whitespace-pre-wrap">{asset.execSum}</p>
              ) : (
                <p className="text-sm text-ink-50 text-center pt-8">(Blank)</p>
              )}
            </div>
          </div>

          <Section title="Tenancy Schedule">
            <div className="overflow-x-auto">
              <table className="sheet text-xs">
                <thead>
                  <tr>
                    <th className="!text-left">Address</th><th className="!text-left">Tenant</th>
                    <th className="!text-left">Demise</th><th className="!text-left">Sector</th>
                    <th>NIA (sq.ft)</th><th>Lease Start</th><th>Lease Expiry</th><th>Break Options</th>
                    <th>Rent p.a.</th><th>£psf</th><th>ERV psf</th>
                    <th>Initial Rent Free</th><th>Rent Free After Break</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.tenancy.map((t) => (
                    <tr key={t.id}>
                      <td className="!text-left">{asset.address}</td>
                      <td className="!text-left">{t.tenant ?? "—"}</td>
                      <td className="!text-left">{t.floor ?? "—"}</td>
                      <td className="!text-left">{t.sector ?? "—"}</td>
                      <td>{fmtNumber(t.niaSqft)}</td>
                      <td>{fmtDate(t.leaseStart)}</td>
                      <td>{fmtDate(t.leaseExpiry)}</td>
                      <td>{fmtDate(t.breakOptions)}</td>
                      <td>{fmtGBP(t.rentPa)}</td>
                      <td>{fmtGBP(t.rentPsf)}</td>
                      <td>{fmtGBP(t.ervPsf)}</td>
                      <td>{t.initialRentFreePeriod ?? "0"}</td>
                      <td>{t.rentFreeAfterBreak ?? "0"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="!text-left">Total</td>
                    <td>{fmtNumber(tenancyTotals.nia)}</td>
                    <td></td><td></td><td></td>
                    <td>{fmtGBP(tenancyTotals.rentPa)}</td>
                    <td>{tenancyTotals.nia ? fmtGBP(tenancyTotals.rentPa / tenancyTotals.nia) : "—"}</td>
                    <td>{tenancyTotals.nia ? fmtGBP(tenancyTotals.ervPa / tenancyTotals.nia) : "—"}</td>
                    <td></td><td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <Section title="Annual Valuation"><SeriesLineChart data={detail.propertyInfoSeries["YEAR END VALUATION"]} /></Section>
          <Section title="Historic & Forecasted Property Information">
            <MetricSelectChart series={detail.propertyInfoSeries} />
          </Section>
          <Section title="Rolling IRR"><SeriesLineChart data={detail.irrSeries} mode="percent" /></Section>
          <Section title="Total Annual Return"><SeriesLineChart data={detail.totalReturnSeries} mode="percent" /></Section>
          <Section title="NOI"><SeriesLineChart data={detail.noiSeries} /></Section>
          <Section title="Passing Income against ERV"><IncomeVsErvChart data={detail.incomeVsErvSeries} /></Section>
          <Section title="Rent at Risk"><RentAtRiskChart data={detail.rentAtRisk} /></Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Tenant Breakdown"><CategoryPie data={detail.tenantPie} /></Section>
            <Section title="Sector Breakdown"><CategoryPie data={detail.sectorPie} /></Section>
          </div>
        </div>
      </div>
    </main>
  );
}
