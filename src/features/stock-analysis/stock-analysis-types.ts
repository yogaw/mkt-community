import { z } from "zod";

/**
 * Normalized broker-flow models.
 *
 * Components only ever see these shapes. Where the numbers come from — our own
 * IDX ingestion today, a vendor later — is a property of the repository, not of
 * the type, so swapping the source changes one file.
 *
 * UNITS, stated once and true everywhere below:
 *   value  IDR
 *   lots   1 lot = 100 shares (broker_summaries stores lots, not shares)
 *   price  IDR per share
 */
export const SHARES_PER_LOT = 100;

/** IDX board. Broker rows carry RG (regular) and NG (negotiated). */
export const MARKET_BOARDS = ["ALL", "RG", "NG"] as const;
export type MarketBoard = (typeof MARKET_BOARDS)[number];

export const BOARD_LABEL: Record<MarketBoard, string> = {
  ALL: "All boards",
  RG: "Regular",
  NG: "Negotiated",
};

export const TOP_BROKER_CHOICES = [5, 8, 10, 15, 0] as const;
/** 0 means every broker that traded. */
export type TopBrokers = (typeof TOP_BROKER_CHOICES)[number];

export const DATE_PRESETS = ["1D", "5D", "1M", "3M", "6M", "YTD", "CUSTOM"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/**
 * How the period's net flow reads.
 *
 * Deliberately about *brokers*, not about investors. A broker code is an
 * execution venue, not a beneficial owner, so nothing here says "institution",
 * "whale" or "smart money".
 */
export const FLOW_STATES = ["ACCUMULATION", "DISTRIBUTION", "BALANCED"] as const;
export type FlowState = (typeof FLOW_STATES)[number];

export const FLOW_STATE_LABEL: Record<FlowState, string> = {
  ACCUMULATION: "Net Accumulation",
  DISTRIBUTION: "Net Distribution",
  BALANCED: "Balanced Flow",
};

export interface BrokerDailyFlow {
  date: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyLots: number;
  sellLots: number;
  netLots: number;
  /** Running total of netValue from the first day of the period. */
  cumulativeNetValue: number;
  cumulativeNetLots: number;
}

export interface BrokerFlow {
  brokerCode: string;
  /** Null until a broker-name reference table exists; the code is never null. */
  brokerName: string | null;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyLots: number;
  sellLots: number;
  netLots: number;
  /** Share of the period's total buy / sell value, 0-100. */
  buySharePercent: number;
  sellSharePercent: number;
  /** Volume-weighted, from the broker's own rows. Null when it never traded that side. */
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  tradingDays: number;
  daily: BrokerDailyFlow[];
}

export interface MarketDayFlow {
  date: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyLots: number;
  sellLots: number;
  netLots: number;
  /** Close for the day, when price history covers it. */
  close: number | null;
}

export interface BrokerConcentration {
  /** Share of total absolute net flow held by the largest 1 / 3 / 5 brokers. */
  top1Percent: number;
  top3Percent: number;
  top5Percent: number;
}

export interface StockBrokerSummary {
  ticker: string;
  startDate: string;
  endDate: string;
  board: MarketBoard;

  totalBuyValue: number;
  totalSellValue: number;
  totalBuyLots: number;
  totalSellLots: number;
  netValue: number;
  netLots: number;
  /** Buy + sell, the denominator the flow threshold is proportional to. */
  totalTradedValue: number;

  flowState: FlowState;
  /** abs(netValue) / totalTradedValue, 0-1. */
  netFlowRatio: number;
  /** One deterministic sentence; no model generates this. */
  insight: string;

  dominantBuyer: BrokerFlow | null;
  dominantSeller: BrokerFlow | null;
  concentration: BrokerConcentration;

  /** Every broker that traded, ranked by netValue descending. */
  brokers: BrokerFlow[];
  /** Only the brokers the chart should draw, in ranking order. */
  chartBrokers: string[];
  daily: MarketDayFlow[];

  tradingDays: number;
  source: string;
  lastUpdated: string | null;
}

/* ----------------------------------------------------------------- query -- */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const brokerSummaryQuerySchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    topBrokers: z.coerce.number().int().min(0).max(100).default(8),
    market: z.enum(MARKET_BOARDS).default("ALL"),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export type BrokerSummaryQuery = z.infer<typeof brokerSummaryQuerySchema>;

export const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.]{1,12}$/, "Not a ticker");

/* ------------------------------------------------------- profile + snapshot */

export interface StockProfile {
  ticker: string;
  name: string | null;
  exchange: string;
  sector: string | null;
  subSector: string | null;
  industry: string | null;
  website: string | null;
  headquarters: string | null;
  listingDate: string | null;
  description: string | null;
  /** close x listedShares, when both are known. */
  marketCap: number | null;
  listedShares: number | null;
  tradeableShares: number | null;
  freeFloatPercent: number | null;
  lastPrice: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  /** Which fields the data behind this profile simply does not carry. */
  missingFields: string[];
}

export interface StockSnapshot {
  ticker: string;
  name: string | null;
  lastPrice: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volumeLots: number | null;
  valueTraded: number | null;
  /** Net foreign value for the latest session, when derivable. */
  foreignNetValue: number | null;
  tradingDate: string | null;
  lastUpdated: string | null;
}

export interface LinkedSignal {
  id: string;
  type: string;
  status: string;
  entryLow: number;
  entryHigh: number;
  target1: number;
  target2: number | null;
  stopLoss: number;
  returnPercent: number | null;
}

export interface LinkedDiscussion {
  id: string;
  title: string;
  category: string;
  commentCount: number;
}

export interface StockOverview {
  snapshot: StockSnapshot;
  profile: StockProfile;
  signal: LinkedSignal | null;
  discussions: LinkedDiscussion[];
  /** Whether this ticker is on the member's watchlist, via the signal above. */
  watchlist: { supported: boolean; watchlisted: boolean; signalId: string | null };
}

export interface StockSearchResult {
  ticker: string;
  name: string | null;
  lastPrice: number | null;
  changePercent: number | null;
  /** Latest closes, oldest first, for the row sparkline. */
  spark: number[];
  valueTraded: number | null;
}
