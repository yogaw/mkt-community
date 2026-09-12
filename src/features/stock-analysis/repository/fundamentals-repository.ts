import type {
  FundamentalPeriod,
  StockFundamentals,
} from "@/features/stock-analysis/fundamentals-types";

/**
 * The seam a fundamentals provider plugs into.
 *
 * Nothing in this app reports company financials, so there is no SQL
 * implementation yet. `SampleFundamentalsRepository` fills the interface for
 * development; swapping in an `ApiFundamentalsRepository` later means changing
 * the export at the bottom of this file and nothing else.
 */
export interface FundamentalsRepository {
  find(ticker: string, period: FundamentalPeriod): Promise<StockFundamentals | null>;
}

/**
 * Deterministic generated financials, seeded from the ticker.
 *
 * Same ticker, same numbers, every run — so a screenshot is reproducible and a
 * chart does not reshuffle on reload. The figures are internally consistent
 * (revenue drives net income drives EPS drives PER) so the screen exercises the
 * real formatting and layout rather than a wall of dashes.
 *
 * These are NOT the financials of the real company behind the ticker, and the
 * service never serves them in production.
 */
export class SampleFundamentalsRepository implements FundamentalsRepository {
  async find(ticker: string, period: FundamentalPeriod): Promise<StockFundamentals | null> {
    const random = mulberry32(seedFrom(ticker));

    const years = [2022, 2023, 2024, 2025];
    const periods = years.map((year) => `FY${year}`);

    let revenue = 2e12 + random() * 4e13;
    const growth = 0.04 + random() * 0.16;
    const netMargin = 0.08 + random() * 0.18;

    const revenues: number[] = [];
    for (let index = 0; index < years.length; index += 1) {
      revenues.push(Math.round(revenue));
      revenue *= 1 + growth * (0.6 + random() * 0.8);
    }

    const netIncomes = revenues.map((value) => Math.round(value * netMargin));
    const shares = Math.round(3e9 + random() * 4e10);
    const epsSeries = netIncomes.map((value) => Math.round((value / shares) * 100) / 100);

    const latestRevenue = revenues.at(-1)!;
    const latestNetIncome = netIncomes.at(-1)!;
    const latestEps = epsSeries.at(-1)!;

    /* Price is derived from earnings rather than drawn independently: a random
       price against a computed EPS produced multiples like PER 1.6x, which
       makes the valuation table useless for judging the layout it exists to
       exercise. A target multiple in a plausible band keeps it coherent. */
    const targetPer = 8 + random() * 16;
    const price = Math.max(50, Math.round(latestEps * targetPer));
    const equity = Math.round(latestNetIncome / (0.1 + random() * 0.12));
    const assets = Math.round(equity * (1.6 + random() * 1.8));
    const debt = Math.round(equity * (0.2 + random() * 0.9));
    const cash = Math.round(assets * (0.05 + random() * 0.12));

    const per = Math.round((price / Math.max(latestEps, 0.01)) * 100) / 100;
    const bookValuePerShare = equity / shares;
    const pbv = Math.round((price / bookValuePerShare) * 100) / 100;

    const money = (values: number[]) => values.map((value) => value);

    return {
      ticker,
      period,
      currency: "IDR",
      provenance: "SAMPLE",
      source: "Generated sample data",
      fiscalYearEnd: "31 December",
      lastUpdated: null,
      metrics: {
        marketCap: price * shares,
        revenue: latestRevenue,
        netIncome: latestNetIncome,
        eps: latestEps,
        per,
        pbv,
        roe: Math.round((latestNetIncome / equity) * 10000) / 100,
        roa: Math.round((latestNetIncome / assets) * 10000) / 100,
        debtToEquity: Math.round((debt / equity) * 100) / 100,
        dividendYield: Math.round((1 + random() * 6) * 100) / 100,
      },
      statements: [
        {
          kind: "INCOME",
          periods,
          lines: [
            { label: "Revenue", values: money(revenues), emphasis: true },
            { label: "Gross Profit", values: money(revenues.map((v) => Math.round(v * (0.22 + netMargin)))) },
            { label: "Operating Income", values: money(revenues.map((v) => Math.round(v * (netMargin + 0.05)))) },
            { label: "EBITDA", values: money(revenues.map((v) => Math.round(v * (netMargin + 0.09)))) },
            { label: "Net Income", values: money(netIncomes), emphasis: true },
            { label: "EPS (Rp)", values: epsSeries },
          ],
        },
        {
          kind: "BALANCE",
          periods,
          lines: [
            { label: "Cash & Equivalents", values: money(revenues.map((v, i) => Math.round(cash * (0.8 + i * 0.08)))) },
            { label: "Total Assets", values: money(revenues.map((_, i) => Math.round(assets * (0.78 + i * 0.08)))), emphasis: true },
            { label: "Total Debt", values: money(revenues.map((_, i) => Math.round(debt * (0.9 + i * 0.05)))) },
            { label: "Total Liabilities", values: money(revenues.map((_, i) => Math.round((assets - equity) * (0.8 + i * 0.07)))) },
            { label: "Total Equity", values: money(revenues.map((_, i) => Math.round(equity * (0.75 + i * 0.09)))), emphasis: true },
          ],
        },
        {
          kind: "CASHFLOW",
          periods,
          lines: [
            { label: "Operating Cash Flow", values: money(netIncomes.map((v) => Math.round(v * 1.25))), emphasis: true },
            { label: "Capital Expenditure", values: money(netIncomes.map((v) => -Math.round(v * 0.45))) },
            { label: "Free Cash Flow", values: money(netIncomes.map((v) => Math.round(v * 0.8))), emphasis: true },
            { label: "Financing Cash Flow", values: money(netIncomes.map((v) => -Math.round(v * 0.3))) },
          ],
        },
      ],
      revenueTrend: periods.map((label, index) => ({ period: label, value: revenues[index] })),
      netIncomeTrend: periods.map((label, index) => ({ period: label, value: netIncomes[index] })),
      epsTrend: periods.map((label, index) => ({ period: label, value: epsSeries[index] })),
      valuation: [
        { label: "PER", current: per, average1Y: round2(per * 1.08), average3Y: round2(per * 1.21), sectorMedian: null, unit: "x" },
        { label: "PBV", current: pbv, average1Y: round2(pbv * 1.05), average3Y: round2(pbv * 1.14), sectorMedian: null, unit: "x" },
        { label: "EV/EBITDA", current: round2(per * 0.62), average1Y: round2(per * 0.68), average3Y: round2(per * 0.74), sectorMedian: null, unit: "x" },
        { label: "Dividend Yield", current: round2(1 + random() * 6), average1Y: round2(1 + random() * 6), average3Y: round2(1 + random() * 6), sectorMedian: null, unit: "%" },
      ],
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Same symbol, same series — so a chart does not reshuffle between reloads. */
function seedFrom(ticker: string): number {
  let hash = 2166136261;
  for (const character of ticker) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fundamentalsRepository: FundamentalsRepository = new SampleFundamentalsRepository();
