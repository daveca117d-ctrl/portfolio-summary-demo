// Static section grouping for the Business Plan vs Current variance table.
// The source workbook has no section column — the report groups these fixed
// category labels into headers by convention. Any category not listed here
// falls into "Other".
export const DEV_SECTIONS: { title: string; categories: string[] }[] = [
  { title: "Programme", categories: ["Acquisition Date", "Planning Consent", "Construction Start", "Construction Completion"] },
  { title: "Areas", categories: ["Total Target NIA", "NIA Uplift"] },
  {
    title: "Capital Expenditure",
    categories: [
      "Construction Cost", "Construction Cost £psf (GIA)", "Professional Fees",
      "Letting and Hold Costs", "Other Development Costs", "Total Development Capex",
    ],
  },
  { title: "Finance", categories: ["LTC", "Total Facility", "Reference Rate", "Margin Rate", "Total Interest", "Other Finance Costs"] },
  { title: "Total Cost", categories: ["Total Cost", "Total Equity Commitment"] },
  { title: "Letting", categories: ["Ave. Letting Void", "Ave. Rent Free", "Fully Let Date", "ERV", "Average ERV £psf"] },
  { title: "Exit", categories: ["Market Sale Price", "Market Sale £psf", "Exit Yield", "Net Sale Proceeds"] },
  {
    title: "Development Returns",
    categories: [
      "Development Profit", "Income During Development Period", "Total Profit",
      "Profit on Cost/Equity", "IRR", "Gross Stabilised Yield",
    ],
  },
];
