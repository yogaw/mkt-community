import type {
  DataStatus,
  InstrumentCategory,
  MarketSection,
} from "@/features/market-data/market-data-model";

/**
 * Every instrument the Market Data module can show, and where its numbers come
 * from.
 *
 * `feed` is the only thing that differs between a connected instrument and one
 * waiting on a provider: `db` reads the ingested series, `sample` generates one
 * through the same interface. Connecting a real feed later means changing this
 * line and nothing in the UI.
 *
 * Vendor symbols under `db` were each verified against the live endpoint before
 * being listed — see docs/idx-market-data.md.
 */
export type Feed =
  | { kind: "db"; code: string }
  | { kind: "sample"; base: number; volatility: number; drift: number };

export interface InstrumentDefinition {
  symbol: string;
  name: string;
  category: InstrumentCategory;
  market: MarketSection;
  benchmark?: string;
  exchange?: string;
  currency: string;
  unit?: string;
  decimals: number;
  source: string;
  dataStatus: DataStatus;
  delayMinutes?: number;
  invertTone?: boolean;
  preferBasisPoints?: boolean;
  feed: Feed;
}

/** Category chips per section, in the order the section shows them. */
export const SECTION_CATEGORIES: Record<MarketSection, InstrumentCategory[]> = {
  global: ["Rates", "Equity", "FX", "Economy"],
  indonesia: ["Indices", "Equity", "Currency", "Rates", "Bonds", "Economy", "Flow"],
  commodities: ["Energy", "Precious Metals", "Base Metals", "Agriculture", "Softs"],
};

export const DEFAULT_INSTRUMENT: Record<MarketSection, string> = {
  global: "DXY",
  indonesia: "IHSG",
  // Coal is the read-through that matters most to an Indonesian reader, but
  // it is not a connected feed and so does not exist in production. Brent is
  // carried, and is what the desk checks next.
  commodities: "BRENT",
};

const EOD = "END_OF_DAY" as const;

export const INSTRUMENTS: InstrumentDefinition[] = [
  // ================= GLOBAL =================
  { symbol: "DXY", name: "US Dollar Index", category: "FX", market: "global", exchange: "ICE", currency: "Index", decimals: 2, source: "ICE", dataStatus: EOD, invertTone: true, feed: { kind: "db", code: "DXY" } },
  { symbol: "US10Y", name: "US 10 Year Treasury Yield", category: "Rates", market: "global", exchange: "CBOE", currency: "%", decimals: 2, source: "CBOE", dataStatus: EOD, invertTone: true, preferBasisPoints: true, feed: { kind: "db", code: "US10Y" } },
  { symbol: "SPX", name: "S&P 500 Index", category: "Equity", market: "global", exchange: "CBOE", currency: "Index", decimals: 2, source: "CBOE", dataStatus: EOD, feed: { kind: "db", code: "SPX" } },
  { symbol: "NDX", name: "Nasdaq Composite", category: "Equity", market: "global", exchange: "NASDAQ", currency: "Index", decimals: 2, source: "NASDAQ", dataStatus: EOD, feed: { kind: "db", code: "NDX" } },
  { symbol: "DJI", name: "Dow Jones Industrial Average", category: "Equity", market: "global", exchange: "NYSE", currency: "Index", decimals: 2, source: "NYSE", dataStatus: EOD, feed: { kind: "db", code: "DJI" } },
  { symbol: "VIX", name: "CBOE Volatility Index", category: "Equity", market: "global", exchange: "CBOE", currency: "Index", decimals: 2, source: "CBOE", dataStatus: EOD, invertTone: true, feed: { kind: "db", code: "VIX" } },
  { symbol: "N225", name: "Nikkei 225 Index", category: "Equity", market: "global", exchange: "JPX", currency: "Index", decimals: 2, source: "JPX", dataStatus: EOD, feed: { kind: "db", code: "N225" } },
  { symbol: "HSI", name: "Hang Seng Index", category: "Equity", market: "global", exchange: "HKEX", currency: "Index", decimals: 2, source: "HKEX", dataStatus: EOD, feed: { kind: "db", code: "HSI" } },
  { symbol: "ES", name: "E-mini S&P 500 Futures", category: "Equity", market: "global", benchmark: "CME E-mini S&P 500", exchange: "CME", currency: "Index", decimals: 2, source: "CME", dataStatus: EOD, feed: { kind: "db", code: "ES" } },
  { symbol: "NQ", name: "E-mini Nasdaq 100 Futures", category: "Equity", market: "global", benchmark: "CME E-mini Nasdaq 100", exchange: "CME", currency: "Index", decimals: 2, source: "CME", dataStatus: EOD, feed: { kind: "db", code: "NQ" } },
  { symbol: "EURUSD", name: "Euro / US Dollar", category: "FX", market: "global", currency: "USD", decimals: 4, source: "Refinitiv composite", dataStatus: EOD, feed: { kind: "db", code: "EURUSD" } },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", category: "FX", market: "global", currency: "USD", decimals: 2, source: "Composite", dataStatus: EOD, feed: { kind: "db", code: "BTCUSD" } },
  // Not connected: release series and the yields the price feed does not carry.
  { symbol: "FEDFUNDS", name: "Federal Funds Target Rate", category: "Rates", market: "global", currency: "%", decimals: 2, source: "Federal Reserve", dataStatus: "SAMPLE", preferBasisPoints: true, feed: { kind: "sample", base: 4.5, volatility: 0, drift: 0 } },
  { symbol: "US2Y", name: "US 2 Year Treasury Yield", category: "Rates", market: "global", currency: "%", decimals: 2, source: "US Treasury", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 4.35, volatility: 0.02, drift: 0.0002 } },
  { symbol: "US30Y", name: "US 30 Year Treasury Yield", category: "Rates", market: "global", currency: "%", decimals: 2, source: "US Treasury", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 5.12, volatility: 0.02, drift: 0.0001 } },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", category: "FX", market: "global", currency: "JPY", decimals: 2, source: "Refinitiv composite", dataStatus: "SAMPLE", feed: { kind: "sample", base: 153.5, volatility: 0.004, drift: 0.0002 } },
  { symbol: "USDCNH", name: "US Dollar / Offshore Yuan", category: "FX", market: "global", currency: "CNH", decimals: 4, source: "Refinitiv composite", dataStatus: "SAMPLE", feed: { kind: "sample", base: 7.12, volatility: 0.002, drift: 0 } },

  // ================= INDONESIA =================
  { symbol: "IHSG", name: "Jakarta Composite Index", category: "Indices", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: EOD, feed: { kind: "db", code: "IHSG" } },
  { symbol: "LQ45", name: "IDX LQ45 Index", category: "Indices", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: EOD, feed: { kind: "db", code: "LQ45" } },
  { symbol: "JII", name: "Jakarta Islamic Index", category: "Indices", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: EOD, feed: { kind: "db", code: "JII" } },
  { symbol: "USDIDR", name: "US Dollar / Indonesian Rupiah", category: "Currency", market: "indonesia", benchmark: "Interbank market rate", currency: "IDR", decimals: 0, source: "Refinitiv composite", dataStatus: EOD, invertTone: true, feed: { kind: "db", code: "USDIDR" } },
  { symbol: "EIDO", name: "iShares MSCI Indonesia ETF", category: "Equity", market: "indonesia", exchange: "NYSE Arca", currency: "USD", decimals: 2, source: "NYSE Arca", dataStatus: EOD, feed: { kind: "db", code: "EIDO" } },
  // JISDOR is a published reference rate, not a tradable quote. Kept separate
  // from USD/IDR on purpose: conflating them would misrepresent both.
  { symbol: "JISDOR", name: "JISDOR Reference Rate", category: "Currency", market: "indonesia", benchmark: "Bank Indonesia reference rate, not a market quote", currency: "IDR", decimals: 0, source: "Bank Indonesia", dataStatus: "SAMPLE", invertTone: true, feed: { kind: "sample", base: 17580, volatility: 0.002, drift: 0.0001 } },
  { symbol: "BIRATE", name: "BI 7-Day Reverse Repo Rate", category: "Rates", market: "indonesia", currency: "%", decimals: 2, source: "Bank Indonesia", dataStatus: "SAMPLE", preferBasisPoints: true, feed: { kind: "sample", base: 5.75, volatility: 0, drift: 0 } },
  { symbol: "INDO2Y", name: "Indonesia 2 Year Government Bond", category: "Bonds", market: "indonesia", currency: "%", decimals: 2, source: "PHEI / IBPA", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 6.42, volatility: 0.015, drift: 0 } },
  { symbol: "INDO5Y", name: "Indonesia 5 Year Government Bond", category: "Bonds", market: "indonesia", currency: "%", decimals: 2, source: "PHEI / IBPA", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 6.92, volatility: 0.015, drift: 0.0001 } },
  { symbol: "INDO10Y", name: "Indonesia 10 Year Government Bond", category: "Bonds", market: "indonesia", currency: "%", decimals: 2, source: "PHEI / IBPA", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 7.1, volatility: 0.012, drift: 0.0001 } },
  { symbol: "CDS5Y", name: "Indonesia 5 Year CDS", category: "Rates", market: "indonesia", currency: "bps", decimals: 2, source: "Markit", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 82.5, volatility: 0.02, drift: 0 } },
  { symbol: "INFLYOY", name: "Indonesia Inflation, year on year", category: "Economy", market: "indonesia", currency: "%", decimals: 2, source: "BPS", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 2.58, volatility: 0, drift: 0 } },
  { symbol: "COREINFL", name: "Indonesia Core Inflation, year on year", category: "Economy", market: "indonesia", currency: "%", decimals: 2, source: "BPS", dataStatus: "SAMPLE", invertTone: true, preferBasisPoints: true, feed: { kind: "sample", base: 2.21, volatility: 0, drift: 0 } },
  { symbol: "IDX30", name: "IDX30 Index", category: "Indices", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: "SAMPLE", feed: { kind: "sample", base: 446, volatility: 0.009, drift: 0.0002 } },
  { symbol: "IDXFIN", name: "IDX Financials Sector Index", category: "Equity", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: "SAMPLE", feed: { kind: "sample", base: 1405, volatility: 0.01, drift: 0 } },
  { symbol: "IDXENERGY", name: "IDX Energy Sector Index", category: "Equity", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: "SAMPLE", feed: { kind: "sample", base: 3472, volatility: 0.013, drift: 0.0003 } },
  { symbol: "IDXBASIC", name: "IDX Basic Materials Sector Index", category: "Equity", market: "indonesia", exchange: "IDX", currency: "IDR", decimals: 2, source: "Indonesia Stock Exchange", dataStatus: "SAMPLE", feed: { kind: "sample", base: 1855, volatility: 0.012, drift: 0.0002 } },

  // ================= COMMODITIES =================
  { symbol: "BRENT", name: "Brent Crude Oil", category: "Energy", market: "commodities", benchmark: "ICE Brent Crude", exchange: "ICE", currency: "USD", unit: "barrel", decimals: 2, source: "ICE", dataStatus: EOD, feed: { kind: "db", code: "BRENT" } },
  { symbol: "WTI", name: "WTI Crude Oil", category: "Energy", market: "commodities", benchmark: "NYMEX WTI Crude", exchange: "NYMEX", currency: "USD", unit: "barrel", decimals: 2, source: "NYMEX", dataStatus: EOD, feed: { kind: "db", code: "WTI" } },
  { symbol: "NATGAS", name: "Natural Gas", category: "Energy", market: "commodities", benchmark: "NYMEX Henry Hub", exchange: "NYMEX", currency: "USD", unit: "MMBtu", decimals: 3, source: "NYMEX", dataStatus: EOD, feed: { kind: "db", code: "NATGAS" } },
  { symbol: "GOLD", name: "Gold", category: "Precious Metals", market: "commodities", benchmark: "COMEX Gold", exchange: "COMEX", currency: "USD", unit: "troy ounce", decimals: 2, source: "COMEX", dataStatus: EOD, feed: { kind: "db", code: "GOLD" } },
  { symbol: "SILVER", name: "Silver", category: "Precious Metals", market: "commodities", benchmark: "COMEX Silver", exchange: "COMEX", currency: "USD", unit: "troy ounce", decimals: 2, source: "COMEX", dataStatus: EOD, feed: { kind: "db", code: "SILVER" } },
  { symbol: "PLATINUM", name: "Platinum", category: "Precious Metals", market: "commodities", benchmark: "NYMEX Platinum", exchange: "NYMEX", currency: "USD", unit: "troy ounce", decimals: 2, source: "NYMEX", dataStatus: EOD, feed: { kind: "db", code: "PLATINUM" } },
  { symbol: "COPPER", name: "Copper", category: "Base Metals", market: "commodities", benchmark: "COMEX Copper", exchange: "COMEX", currency: "USD", unit: "pound", decimals: 3, source: "COMEX", dataStatus: EOD, feed: { kind: "db", code: "COPPER" } },
  // The connected palm-oil contract is CME's USD series. The Bursa MYR contract
  // the desk usually quotes is a different instrument and is not carried.
  { symbol: "CPOUSD", name: "Crude Palm Oil, CME USD contract", category: "Agriculture", market: "commodities", benchmark: "CME USD Malaysian Crude Palm Oil", exchange: "CME", currency: "USD", unit: "metric tonne", decimals: 2, source: "CME", dataStatus: EOD, feed: { kind: "db", code: "CPO" } },
  // Not connected.
  { symbol: "NEWCOAL", name: "Newcastle Coal Futures", category: "Energy", market: "commodities", benchmark: "ICE Newcastle Coal Futures", exchange: "ICE", currency: "USD", unit: "metric tonne", decimals: 2, source: "ICE", dataStatus: "SAMPLE", feed: { kind: "sample", base: 147.35, volatility: 0.014, drift: 0.0004 } },
  { symbol: "NICKEL", name: "Nickel", category: "Base Metals", market: "commodities", benchmark: "LME Nickel", exchange: "LME", currency: "USD", unit: "tonne", decimals: 2, source: "LME", dataStatus: "SAMPLE", feed: { kind: "sample", base: 16755, volatility: 0.013, drift: 0 } },
  { symbol: "TIN", name: "Tin", category: "Base Metals", market: "commodities", benchmark: "LME Tin", exchange: "LME", currency: "USD", unit: "tonne", decimals: 2, source: "LME", dataStatus: "SAMPLE", feed: { kind: "sample", base: 54910, volatility: 0.012, drift: 0.0003 } },
  { symbol: "ALUMINIUM", name: "Aluminium", category: "Base Metals", market: "commodities", benchmark: "LME Aluminium", exchange: "LME", currency: "USD", unit: "tonne", decimals: 2, source: "LME", dataStatus: "SAMPLE", feed: { kind: "sample", base: 2640, volatility: 0.01, drift: 0.0001 } },
  { symbol: "FCPO", name: "Crude Palm Oil, Bursa contract", category: "Agriculture", market: "commodities", benchmark: "Bursa Malaysia FCPO", exchange: "Bursa Malaysia", currency: "MYR", unit: "tonne", decimals: 2, source: "Bursa Malaysia", dataStatus: "SAMPLE", feed: { kind: "sample", base: 4966, volatility: 0.011, drift: 0.0002 } },
  { symbol: "WHEAT", name: "Wheat", category: "Softs", market: "commodities", benchmark: "CBOT Wheat", exchange: "CBOT", currency: "USc", unit: "bushel", decimals: 2, source: "CBOT", dataStatus: "SAMPLE", feed: { kind: "sample", base: 612, volatility: 0.012, drift: 0 } },
  { symbol: "CORN", name: "Corn", category: "Softs", market: "commodities", benchmark: "CBOT Corn", exchange: "CBOT", currency: "USc", unit: "bushel", decimals: 2, source: "CBOT", dataStatus: "SAMPLE", feed: { kind: "sample", base: 532, volatility: 0.011, drift: 0 } },
  { symbol: "SOYBEAN", name: "Soybeans", category: "Softs", market: "commodities", benchmark: "CBOT Soybeans", exchange: "CBOT", currency: "USc", unit: "bushel", decimals: 2, source: "CBOT", dataStatus: "SAMPLE", feed: { kind: "sample", base: 1284, volatility: 0.011, drift: 0.0001 } },
];

export const INSTRUMENT_BY_SYMBOL = new Map(INSTRUMENTS.map((item) => [item.symbol, item]));

/**
 * Sample-backed instruments are development scaffolding. They are dropped in
 * production rather than badged more quietly: a generated price shown to a
 * paying member is a fabricated price, whatever label sits beside it.
 */
export function isVisibleInEnvironment(
  definition: InstrumentDefinition,
  isProduction: boolean,
): boolean {
  return !isProduction || definition.feed.kind !== "sample";
}
