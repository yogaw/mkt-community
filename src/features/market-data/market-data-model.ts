/**
 * The normalized market-data model.
 *
 * Presentation components only ever see this shape. Where a value comes from —
 * our own IDX ingestion, a price vendor, or sample data standing in for a feed
 * that is not wired up — is a property of the instrument, not a different type,
 * so swapping a provider later changes the catalogue and nothing else.
 */
export const MARKET_SECTIONS = ["global", "indonesia", "commodities"] as const;
export type MarketSection = (typeof MARKET_SECTIONS)[number];

export const SECTION_LABEL: Record<MarketSection, string> = {
  global: "Global Market",
  indonesia: "Indonesia Market",
  commodities: "Commodities",
};

export const SECTION_SUBTITLE: Record<MarketSection, string> = {
  global: "Global market data, cross-asset indicators, charts and macro context.",
  indonesia: "Indonesian equities, currency, rates, foreign flow and economic indicators.",
  commodities: "Global commodity prices, benchmarks, charts and market drivers.",
};

/**
 * How current a number is, stated rather than implied.
 *
 * SAMPLE is not a freshness level — it means the feed is not connected and the
 * series is generated. It is excluded from production entirely rather than
 * shown with a quieter badge.
 */
export type DataStatus = "LIVE" | "DELAYED" | "END_OF_DAY" | "OFFICIAL_RELEASE" | "SAMPLE";

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  LIVE: "Live",
  DELAYED: "Delayed",
  END_OF_DAY: "End of day",
  OFFICIAL_RELEASE: "Official release",
  SAMPLE: "Sample data",
};

export type InstrumentCategory =
  | "Indices"
  | "Equity"
  | "Rates"
  | "Bonds"
  | "Currency"
  | "FX"
  | "Economy"
  | "Energy"
  | "Precious Metals"
  | "Base Metals"
  | "Agriculture"
  | "Softs"
  | "Flow";

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface Instrument {
  symbol: string;
  name: string;
  category: InstrumentCategory;
  market: MarketSection;
  /** Contract or index the number refers to, where that is not obvious. */
  benchmark: string | null;
  exchange: string | null;
  currency: string;
  /** "barrel", "troy ounce", "metric tonne"; null for an index or a rate. */
  unit: string | null;
  decimals: number;

  value: number;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;

  /** Publisher, named so a reader can judge the number. */
  source: string;
  dataStatus: DataStatus;
  delayMinutes: number | null;
  /** ISO date of the observation, not of the request. */
  timestamp: string;

  /** A rise reads as risk-off: yields, the dollar, volatility. */
  invertTone: boolean;
  /** Percentage change is not meaningful for a policy rate or a yield. */
  preferBasisPoints: boolean;

  history: HistoryPoint[];
}

/** Rates move in basis points; quoting 0.63% of 4.97% tells a reader nothing. */
export function basisPointChange(change: number | null): number | null {
  return change === null ? null : Math.round(change * 100);
}

export function isStale(instrument: Instrument, latestAcrossMarket: string): boolean {
  return instrument.timestamp < latestAcrossMarket;
}
