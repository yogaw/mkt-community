// Placeholder market data for the dashboard sections that are not yet backed
// by real data. Stocks in Focus has moved to the signals themselves. The index snapshot has moved to the database — see
// features/market-index. Everything below is still illustrative only.

export interface MarketInsight {
  id: string;
  topic: string;
  statement: string;
  tickers: string[];
  href: string;
}

export type SectorView = "Positive" | "Neutral" | "Watch";

export interface SectorReading {
  sector: string;
  changePercent: number;
  view: SectorView;
}

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

export const sectorPulse: SectorReading[] = [
  { sector: "Financials", changePercent: 1.42, view: "Positive" },
  { sector: "Energy", changePercent: 0.83, view: "Neutral" },
  { sector: "Basic Materials", changePercent: 0.41, view: "Neutral" },
  { sector: "Consumer", changePercent: -0.18, view: "Watch" },
  { sector: "Technology", changePercent: -1.12, view: "Watch" },
];
