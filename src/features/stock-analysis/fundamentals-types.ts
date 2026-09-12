/**
 * Fundamentals: the shape, independent of where the numbers come from.
 *
 * Nothing in Piranha's database carries company financials today — not
 * revenue, not EPS, not a sector label. That is why every field here is
 * nullable and why the DTO states its own provenance: a fundamentals screen
 * that cannot say where its numbers came from has no business being in a paid
 * research product.
 */
export const FUNDAMENTAL_PERIODS = ["TTM", "FY", "QUARTERLY"] as const;
export type FundamentalPeriod = (typeof FUNDAMENTAL_PERIODS)[number];

export const PERIOD_LABEL: Record<FundamentalPeriod, string> = {
  TTM: "TTM",
  FY: "Full year",
  QUARTERLY: "Quarterly",
};

export const STATEMENTS = ["INCOME", "BALANCE", "CASHFLOW"] as const;
export type StatementKind = (typeof STATEMENTS)[number];

export const STATEMENT_LABEL: Record<StatementKind, string> = {
  INCOME: "Income Statement",
  BALANCE: "Balance Sheet",
  CASHFLOW: "Cash Flow",
};

export interface StatementLine {
  label: string;
  /** One value per column in `periods`, same order. Null where not reported. */
  values: Array<number | null>;
  /** Renders bold with a rule above — subtotals and totals. */
  emphasis?: boolean;
}

export interface FinancialStatement {
  kind: StatementKind;
  /** Column headings, oldest first: "FY2023", "FY2024", … */
  periods: string[];
  lines: StatementLine[];
}

export interface FundamentalMetrics {
  marketCap: number | null;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  per: number | null;
  pbv: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
}

export interface TrendPoint {
  period: string;
  value: number | null;
}

export interface ValuationRow {
  label: string;
  current: number | null;
  average1Y: number | null;
  average3Y: number | null;
  sectorMedian: number | null;
  /** "x" for a multiple, "%" for a yield. */
  unit: "x" | "%";
}

/**
 * How real the numbers on this screen are.
 *
 * SAMPLE means generated for development. It is not a freshness level, and it
 * is never served in production — the service drops it and the tab shows an
 * empty state instead, because a fabricated revenue figure attached to a real
 * listed company is worse than no revenue figure at all.
 */
export type FundamentalsProvenance = "REPORTED" | "SAMPLE";

export interface StockFundamentals {
  ticker: string;
  period: FundamentalPeriod;
  currency: string;
  provenance: FundamentalsProvenance;
  source: string;
  fiscalYearEnd: string | null;
  lastUpdated: string | null;
  metrics: FundamentalMetrics;
  statements: FinancialStatement[];
  revenueTrend: TrendPoint[];
  netIncomeTrend: TrendPoint[];
  epsTrend: TrendPoint[];
  valuation: ValuationRow[];
}
