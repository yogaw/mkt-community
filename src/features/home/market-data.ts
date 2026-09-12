// Placeholder market data for the reworked dashboard.
// These views need a real IDX market-data source before production;
// all values below are illustrative only.

export interface MarketSnapshotData {
  indexName: string;
  value: number;
  changePercent: number;
  turnover: string;
  foreignFlow: string;
  advancers: number;
  decliners: number;
}

export interface MarketInsight {
  id: string;
  topic: string;
  statement: string;
  tickers: string[];
  href: string;
}

export interface FocusStock {
  ticker: string;
  company: string;
  price: number;
  changePercent: number;
  thesis: string;
  keyLevel: number | null;
  href: string;
}

export type SectorView = "Positive" | "Neutral" | "Watch";

export interface SectorReading {
  sector: string;
  changePercent: number;
  view: SectorView;
}

export const indonesiaMarketSnapshot: MarketSnapshotData = {
  indexName: "IHSG",
  value: 7845.21,
  changePercent: 0.72,
  turnover: "Rp 8.4T",
  foreignFlow: "+Rp 640B",
  advancers: 312,
  decliners: 221,
};

export const briefingTickers = ["BBCA", "BMRI", "BBRI", "ANTM"];

export const todaysInsights: MarketInsight[] = [
  {
    id: "insight-foreign-flow",
    topic: "Foreign Flow",
    statement: "Foreign investors returned to big-cap banking stocks.",
    tickers: ["BBCA", "BMRI", "BBRI"],
    href: "/updates",
  },
  {
    id: "insight-bank-indonesia",
    topic: "Bank Indonesia",
    statement: "Investors are positioning around future monetary policy expectations.",
    tickers: ["BBRI", "BMRI", "TLKM"],
    href: "/updates",
  },
  {
    id: "insight-commodities",
    topic: "Commodities",
    statement: "Nickel prices remain an important catalyst for metal stocks.",
    tickers: ["ANTM", "INCO", "MDKA"],
    href: "/updates",
  },
];

export const stocksInFocus: FocusStock[] = [
  {
    ticker: "BBCA",
    company: "Bank Central Asia",
    price: 9850,
    changePercent: 1.24,
    thesis: "Accumulation remains visible around large-cap banking stocks.",
    keyLevel: 9700,
    href: "/discussion",
  },
  {
    ticker: "ANTM",
    company: "Aneka Tambang",
    price: 2140,
    changePercent: 3.12,
    thesis: "Momentum remains supported by commodity sentiment.",
    keyLevel: 2050,
    href: "/discussion",
  },
  {
    ticker: "BMRI",
    company: "Bank Mandiri",
    price: 5425,
    changePercent: 0.93,
    thesis: "Valuation still trails peers while loan growth stays solid.",
    keyLevel: 5300,
    href: "/discussion",
  },
  {
    ticker: "TLKM",
    company: "Telkom Indonesia",
    price: 2980,
    changePercent: -0.67,
    thesis: "Defensive positioning continues ahead of policy decisions.",
    keyLevel: 2900,
    href: "/discussion",
  },
];

export const sectorPulse: SectorReading[] = [
  { sector: "Financials", changePercent: 1.42, view: "Positive" },
  { sector: "Energy", changePercent: 0.83, view: "Neutral" },
  { sector: "Basic Materials", changePercent: 0.41, view: "Neutral" },
  { sector: "Consumer", changePercent: -0.18, view: "Watch" },
  { sector: "Technology", changePercent: -1.12, view: "Watch" },
];
