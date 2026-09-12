/**
 * What the Market Data page shows, and how to read each number.
 *
 * The unit is declared here rather than in the database: a close is points for
 * an index, percent for a yield, and a currency amount for a commodity or a
 * rate. One numeric column stores them all; only this catalogue knows what a
 * given row means.
 *
 * Every symbol was verified against the live endpoint on 2026-09-12 before
 * being listed. Adding one means checking it resolves first — an unknown
 * symbol returns an error payload, not an empty series, and the fetcher
 * reports it rather than writing nothing quietly.
 */
export const INDICATOR_GROUPS = ["GLOBAL", "INDONESIA", "COMMODITY"] as const;
export type IndicatorGroup = (typeof INDICATOR_GROUPS)[number];

export const GROUP_LABEL: Record<IndicatorGroup, string> = {
  GLOBAL: "Global Market",
  INDONESIA: "Indonesia Market",
  COMMODITY: "Commodities",
};

/** Drives formatting, not storage. */
export type IndicatorUnit = "INDEX" | "PERCENT" | "USD" | "IDR";

export type IndicatorCategory = "Equity" | "Rates" | "Currency" | "Commodities";

export interface IndicatorDefinition {
  /** Stable key used in the database and the API; not the vendor's symbol. */
  code: string;
  label: string;
  description: string;
  group: IndicatorGroup;
  category: IndicatorCategory;
  unit: IndicatorUnit;
  decimals: number;
  /** Where the daily close comes from. */
  source: "yahoo" | "idx";
  /** Vendor symbol, for the yahoo-sourced ones. */
  vendorSymbol?: string;
  /** A rising value is usually read as risk-off rather than good news. */
  invertTone?: boolean;
}

export const INDICATORS: IndicatorDefinition[] = [
  // --- Global ---
  { code: "SPX", label: "S&P 500", description: "S&P 500 Index", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^GSPC" },
  { code: "NDX", label: "Nasdaq", description: "Nasdaq Composite", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^IXIC" },
  { code: "DJI", label: "Dow Jones", description: "Dow Jones Industrial Average", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^DJI" },
  { code: "N225", label: "Nikkei 225", description: "Nikkei 225 Index", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^N225" },
  { code: "HSI", label: "Hang Seng", description: "Hang Seng Index", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^HSI" },
  { code: "DXY", label: "DXY", description: "US Dollar Index", group: "GLOBAL", category: "Currency", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "DX-Y.NYB" },
  { code: "US10Y", label: "US 10Y", description: "US 10 Year Treasury Yield (%)", group: "GLOBAL", category: "Rates", unit: "PERCENT", decimals: 2, source: "yahoo", vendorSymbol: "^TNX", invertTone: true },
  { code: "VIX", label: "VIX", description: "CBOE Volatility Index", group: "GLOBAL", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^VIX", invertTone: true },

  // --- Indonesia ---
  // IHSG comes from our own IDX ingestion, not the vendor: index_summaries is
  // the authoritative copy and two sources would eventually disagree on screen.
  { code: "IHSG", label: "IHSG", description: "Jakarta Composite Index", group: "INDONESIA", category: "Equity", unit: "INDEX", decimals: 2, source: "idx" },
  { code: "LQ45", label: "LQ45", description: "LQ45 Index", group: "INDONESIA", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^JKLQ45" },
  { code: "JII", label: "JII", description: "Jakarta Islamic Index", group: "INDONESIA", category: "Equity", unit: "INDEX", decimals: 2, source: "yahoo", vendorSymbol: "^JKII" },
  { code: "USDIDR", label: "USD/IDR", description: "Rupiah per US Dollar", group: "INDONESIA", category: "Currency", unit: "IDR", decimals: 0, source: "yahoo", vendorSymbol: "IDR=X", invertTone: true },
  { code: "EIDO", label: "EIDO", description: "iShares MSCI Indonesia ETF (US$)", group: "INDONESIA", category: "Equity", unit: "USD", decimals: 2, source: "yahoo", vendorSymbol: "EIDO" },

  // --- Commodities ---
  { code: "BRENT", label: "Brent", description: "Brent Crude (US$/bbl)", group: "COMMODITY", category: "Commodities", unit: "USD", decimals: 2, source: "yahoo", vendorSymbol: "BZ=F" },
  { code: "WTI", label: "WTI", description: "WTI Crude (US$/bbl)", group: "COMMODITY", category: "Commodities", unit: "USD", decimals: 2, source: "yahoo", vendorSymbol: "CL=F" },
  { code: "GOLD", label: "Gold", description: "Gold (US$/oz)", group: "COMMODITY", category: "Commodities", unit: "USD", decimals: 2, source: "yahoo", vendorSymbol: "GC=F" },
  { code: "COPPER", label: "Copper", description: "Copper (US$/lb)", group: "COMMODITY", category: "Commodities", unit: "USD", decimals: 3, source: "yahoo", vendorSymbol: "HG=F" },
  { code: "NATGAS", label: "Nat Gas", description: "Natural Gas (US$/MMBtu)", group: "COMMODITY", category: "Commodities", unit: "USD", decimals: 3, source: "yahoo", vendorSymbol: "NG=F" },
];

export const INDICATOR_BY_CODE = new Map(INDICATORS.map((item) => [item.code, item]));

/**
 * Not carried yet, and deliberately absent rather than faked.
 *
 * Fed funds target, US CPI / Core CPI / PCE and consumer sentiment are release
 * series, not traded instruments, so the price vendor does not carry them.
 * FRED publishes all of them free but needs an API key. Add a `source: "fred"`
 * branch to the fetcher and the rows here once a key exists.
 */
export const UNAVAILABLE_INDICATORS = [
  "Fed funds target rate",
  "US CPI / Core CPI year on year",
  "US PCE year on year",
  "U. Michigan consumer sentiment",
  "Bank Indonesia policy rate",
] as const;
