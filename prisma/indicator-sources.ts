/**
 * What the ingestion pulls, and from which vendor symbol.
 *
 * Deliberately separate from the display catalogue in
 * src/features/market-data/catalogue/instruments.ts. That file says what a
 * member sees and how to read it; this one says where a row in
 * market_indicator_point comes from. They meet at `code`, and
 * catalogue-coverage.test.ts fails if a displayed instrument has no source
 * here — otherwise a typo would just make an instrument quietly vanish.
 *
 * Every vendor symbol was verified against the live endpoint on 2026-09-12
 * before being listed; an unknown symbol returns an error payload, not an
 * empty series.
 */
export interface IndicatorSource {
  /** Stable key stored in market_indicator_point.symbol. */
  code: string;
  /** Vendor symbol, or null when the series comes from our own IDX ingestion. */
  vendorSymbol: string | null;
  source: "yahoo" | "idx";
}

export const INDICATOR_SOURCES: IndicatorSource[] = [
  // --- Global ---
  { code: "SPX", vendorSymbol: "^GSPC", source: "yahoo" },
  { code: "NDX", vendorSymbol: "^IXIC", source: "yahoo" },
  { code: "DJI", vendorSymbol: "^DJI", source: "yahoo" },
  { code: "N225", vendorSymbol: "^N225", source: "yahoo" },
  { code: "HSI", vendorSymbol: "^HSI", source: "yahoo" },
  { code: "DXY", vendorSymbol: "DX-Y.NYB", source: "yahoo" },
  { code: "US10Y", vendorSymbol: "^TNX", source: "yahoo" },
  { code: "VIX", vendorSymbol: "^VIX", source: "yahoo" },
  { code: "ES", vendorSymbol: "ES=F", source: "yahoo" },
  { code: "NQ", vendorSymbol: "NQ=F", source: "yahoo" },
  { code: "EURUSD", vendorSymbol: "EURUSD=X", source: "yahoo" },
  { code: "BTCUSD", vendorSymbol: "BTC-USD", source: "yahoo" },

  // --- Indonesia ---
  // IHSG is mirrored from index_summaries, which is the authoritative IDX
  // copy. Two sources for one number would eventually disagree on screen.
  { code: "IHSG", vendorSymbol: null, source: "idx" },
  { code: "LQ45", vendorSymbol: "^JKLQ45", source: "yahoo" },
  { code: "JII", vendorSymbol: "^JKII", source: "yahoo" },
  { code: "USDIDR", vendorSymbol: "IDR=X", source: "yahoo" },
  { code: "EIDO", vendorSymbol: "EIDO", source: "yahoo" },

  // --- Commodities ---
  { code: "BRENT", vendorSymbol: "BZ=F", source: "yahoo" },
  { code: "WTI", vendorSymbol: "CL=F", source: "yahoo" },
  { code: "GOLD", vendorSymbol: "GC=F", source: "yahoo" },
  { code: "SILVER", vendorSymbol: "SI=F", source: "yahoo" },
  { code: "PLATINUM", vendorSymbol: "PL=F", source: "yahoo" },
  { code: "COPPER", vendorSymbol: "HG=F", source: "yahoo" },
  { code: "NATGAS", vendorSymbol: "NG=F", source: "yahoo" },
  // Verified via quoteType: "USD Malaysian Crude Palm Oil" on CME, priced in
  // US dollars — not the Bursa Malaysia MYR contract the desk usually quotes.
  // Its meta quote is frozen at 2024 while the daily bars stay current, which
  // is why the fetcher reads bars and never meta.regularMarketPrice.
  { code: "CPO", vendorSymbol: "CPO=F", source: "yahoo" },
];

/**
 * Wanted but not carried, and absent rather than faked.
 *
 * These are release series or exchange data the price vendor does not publish
 * free. They appear in the display catalogue with a `sample` feed, which is
 * shown in development and dropped in production.
 */
export const UNAVAILABLE_SERIES = [
  "Fed funds target rate, US CPI / Core CPI / PCE — FRED carries all of them free but needs an API key",
  "US 2Y and 30Y Treasury yields — the vendor carries ^TNX only",
  "Bank Indonesia policy rate, JISDOR, Indonesian inflation — Bank Indonesia and BPS publish these, no machine endpoint wired up",
  "Indonesia government bond yields — PHEI/IBPA, subscription",
  "IDX30 and the IDX sector indices — IDX publishes them, our ingestion does not read them yet",
  "Newcastle coal — the vendor's MTF=F is API2 Rotterdam and its series is dead (last bar 2025-12-26)",
  "LME nickel, tin and aluminium — LME licenses its prices",
  "Bursa Malaysia FCPO — licensed",
] as const;
