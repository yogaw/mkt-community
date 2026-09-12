import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import {
  averagePrice,
  buildInsight,
  concentrationOf,
  flowStateOf,
  netFlowRatio,
  sharePercent,
  withCumulative,
} from "@/features/stock-analysis/broker-flow-math";
import {
  SHARES_PER_LOT,
  type BrokerFlow,
  type BrokerSummaryQuery,
  type LinkedSignal,
  type MarketDayFlow,
  type StockBrokerSummary,
  type StockOverview,
  type StockProfile,
  type StockSearchResult,
  type StockSnapshot,
} from "@/features/stock-analysis/stock-analysis-types";
import type {
  FundamentalPeriod,
  StockFundamentals,
} from "@/features/stock-analysis/fundamentals-types";
import type {
  BrokerAnalysisRepository,
  BrokerDayRow,
} from "@/features/stock-analysis/repository/broker-analysis-repository";
import { brokerAnalysisRepository } from "@/features/stock-analysis/repository/broker-analysis-repository";
import type {
  StockProfileRepository,
  StockSearchRow,
} from "@/features/stock-analysis/repository/stock-profile-repository";
import { stockProfileRepository } from "@/features/stock-analysis/repository/stock-profile-repository";
import type { FundamentalsRepository } from "@/features/stock-analysis/repository/fundamentals-repository";
import { fundamentalsRepository } from "@/features/stock-analysis/repository/fundamentals-repository";

const SOURCE = "IDX broker transaction summary";
const SPARK_SESSIONS = 30;
const LINKED_DISCUSSIONS = 3;

/**
 * Company facts the app simply does not hold. Named rather than left blank, so
 * the profile tab can say what is missing instead of rendering silent gaps —
 * and so nobody is tempted to fill them in from somewhere unverified.
 */
const UNSOURCED_PROFILE_FIELDS = [
  "Sector, sub-sector and industry",
  "Listing date",
  "Website and headquarters",
  "Company description and business segments",
  "Major shareholders",
];

export interface StockAnalysisService {
  getBrokerSummary(ticker: string, query: BrokerSummaryQuery): Promise<StockBrokerSummary>;
  getOverview(ticker: string, userId: string): Promise<StockOverview>;
  getFundamentals(ticker: string, period: FundamentalPeriod): Promise<StockFundamentals | null>;
  search(term: string, limit: number): Promise<StockSearchResult[]>;
  mostActive(limit: number): Promise<StockSearchResult[]>;
  watchlist(userId: string, limit: number): Promise<StockSearchResult[]>;
  coverage(): Promise<{ earliest: string; latest: string } | null>;
}

export class StockAnalysisServiceImpl implements StockAnalysisService {
  constructor(
    private readonly brokers: BrokerAnalysisRepository,
    private readonly stocks: StockProfileRepository,
    private readonly fundamentals: FundamentalsRepository,
  ) {}

  async getBrokerSummary(
    ticker: string,
    query: BrokerSummaryQuery,
  ): Promise<StockBrokerSummary> {
    const [rows, closes, lastUpdated] = await Promise.all([
      this.brokers.findBrokerDays(ticker, query.startDate, query.endDate, query.market),
      this.brokers.findDailyCloses(ticker, query.startDate, query.endDate),
      this.brokers.findLatestIngestAt(ticker),
    ]);

    const closeByDate = new Map(closes.map((row) => [row.date, row.close]));
    const empty = rows.length === 0;

    const byBroker = groupByBroker(rows);
    const dates = [...new Set(rows.map((row) => row.date))].sort();

    const brokers: BrokerFlow[] = [];
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let totalBuyLots = 0;
    let totalSellLots = 0;

    for (const [brokerCode, days] of byBroker) {
      const ordered = days.sort((a, b) => a.date.localeCompare(b.date));
      const daily = withCumulative(
        ordered.map((row) => {
          const buyValue = Number(row.buyValue);
          const sellValue = Number(row.sellValue);
          const buyLots = Number(row.buyLots);
          const sellLots = Number(row.sellLots);
          return {
            date: row.date,
            buyValue,
            sellValue,
            netValue: buyValue - sellValue,
            buyLots,
            sellLots,
            netLots: buyLots - sellLots,
          };
        }),
      );

      const buyValue = sum(daily, (day) => day.buyValue);
      const sellValue = sum(daily, (day) => day.sellValue);
      const buyLots = sum(daily, (day) => day.buyLots);
      const sellLots = sum(daily, (day) => day.sellLots);

      totalBuyValue += buyValue;
      totalSellValue += sellValue;
      totalBuyLots += buyLots;
      totalSellLots += sellLots;

      brokers.push({
        brokerCode,
        // No broker-name reference table exists; the code is what IDX publishes
        // and inventing a name for it would be worse than showing the code.
        brokerName: null,
        buyValue,
        sellValue,
        netValue: buyValue - sellValue,
        buyLots,
        sellLots,
        netLots: buyLots - sellLots,
        buySharePercent: 0,
        sellSharePercent: 0,
        avgBuyPrice: averagePrice(buyValue, buyLots),
        avgSellPrice: averagePrice(sellValue, sellLots),
        tradingDays: daily.filter((day) => day.buyValue > 0 || day.sellValue > 0).length,
        daily,
      });
    }

    for (const broker of brokers) {
      broker.buySharePercent = sharePercent(broker.buyValue, totalBuyValue);
      broker.sellSharePercent = sharePercent(broker.sellValue, totalSellValue);
    }
    brokers.sort((a, b) => b.netValue - a.netValue);

    const netValue = totalBuyValue - totalSellValue;
    const netLots = totalBuyLots - totalSellLots;
    const totalTradedValue = totalBuyValue + totalSellValue;

    const daily: MarketDayFlow[] = dates.map((date) => {
      const dayRows = rows.filter((row) => row.date === date);
      const buyValue = sum(dayRows, (row) => Number(row.buyValue));
      const sellValue = sum(dayRows, (row) => Number(row.sellValue));
      const buyLots = sum(dayRows, (row) => Number(row.buyLots));
      const sellLots = sum(dayRows, (row) => Number(row.sellLots));
      return {
        date,
        buyValue,
        sellValue,
        netValue: buyValue - sellValue,
        buyLots,
        sellLots,
        netLots: buyLots - sellLots,
        close: closeByDate.get(date) ?? null,
      };
    });

    const dominantBuyer = brokers.find((broker) => broker.netValue > 0) ?? null;
    const dominantSeller = [...brokers].reverse().find((broker) => broker.netValue < 0) ?? null;
    const concentration = concentrationOf(brokers);

    // topBrokers === 0 means "All" in the control; it limits the chart only,
    // never the table, which always carries every broker that traded.
    const chartCount = query.topBrokers === 0 ? brokers.length : query.topBrokers;
    const chartBrokers = pickChartBrokers(brokers, chartCount);

    return {
      ticker,
      startDate: query.startDate,
      endDate: query.endDate,
      board: query.market,
      totalBuyValue,
      totalSellValue,
      totalBuyLots,
      totalSellLots,
      netValue,
      netLots,
      totalTradedValue,
      flowState: flowStateOf(netValue, totalTradedValue),
      netFlowRatio: netFlowRatio(netValue, totalTradedValue),
      insight: buildInsight({
        netValue,
        totalTradedValue,
        topBuyer: dominantBuyer,
        topSeller: dominantSeller,
        concentration,
      }),
      dominantBuyer,
      dominantSeller,
      concentration,
      brokers: empty ? [] : brokers,
      chartBrokers,
      daily,
      tradingDays: dates.length,
      source: SOURCE,
      lastUpdated,
    };
  }

  async getOverview(ticker: string, userId: string): Promise<StockOverview> {
    const [name, summary, range, signalRow, discussions] = await Promise.all([
      this.stocks.findName(ticker),
      this.stocks.findLatestSummary(ticker),
      this.stocks.findYearRange(ticker),
      this.stocks.findSignalForTicker(ticker, userId),
      this.stocks.findDiscussionsForTicker(ticker, LINKED_DISCUSSIONS),
    ]);

    if (!summary && !name) {
      throw new AppError(404, ErrorCode.notFound);
    }

    const close = summary?.close ?? null;
    const previousClose = summary?.previousClose ?? null;
    const change = summary?.change ?? null;
    const listedShares = summary?.listedShares === null || summary?.listedShares === undefined
      ? null
      : Number(summary.listedShares);
    const tradeableShares =
      summary?.tradeableShares === null || summary?.tradeableShares === undefined
        ? null
        : Number(summary.tradeableShares);

    const snapshot: StockSnapshot = {
      ticker,
      name,
      lastPrice: close,
      change,
      changePercent:
        change !== null && previousClose !== null && previousClose !== 0
          ? Math.round((change / previousClose) * 10000) / 100
          : null,
      previousClose,
      dayHigh: summary?.high ?? null,
      dayLow: summary?.low ?? null,
      // stock_summaries is in SHARES; the screen talks in lots like the rest of
      // the broker data, so the conversion happens once, here.
      volumeLots: summary ? Math.round(Number(summary.volumeShares) / SHARES_PER_LOT) : null,
      valueTraded: summary ? Number(summary.value) : null,
      foreignNetValue: foreignNetValue(summary, close),
      tradingDate: summary?.date ?? null,
      lastUpdated: summary?.updatedAt?.toISOString() ?? null,
    };

    const profile: StockProfile = {
      ticker,
      name,
      exchange: "IDX",
      // Named as absent rather than guessed: the app holds no company registry.
      sector: null,
      subSector: null,
      industry: null,
      website: null,
      headquarters: null,
      listingDate: null,
      description: null,
      marketCap: close !== null && listedShares !== null ? close * listedShares : null,
      listedShares,
      tradeableShares,
      freeFloatPercent:
        listedShares !== null && tradeableShares !== null && listedShares > 0
          ? Math.round((tradeableShares / listedShares) * 10000) / 100
          : null,
      lastPrice: close,
      yearHigh: range?.high ?? null,
      yearLow: range?.low ?? null,
      missingFields: UNSOURCED_PROFILE_FIELDS,
    };

    const signal: LinkedSignal | null = signalRow
      ? {
          id: signalRow.id,
          type: signalRow.type,
          status: signalRow.status,
          entryLow: signalRow.entryLow,
          entryHigh: signalRow.entryHigh,
          target1: signalRow.target1,
          target2: signalRow.target2,
          stopLoss: signalRow.stopLoss,
          returnPercent: returnPercent(signalRow.entryLow, signalRow.entryHigh, signalRow.currentPrice),
        }
      : null;

    return {
      snapshot,
      profile,
      signal,
      discussions,
      /*
       * Piranha's watchlist is keyed to a signal, not to a ticker. Where a
       * signal exists this drives the existing endpoint; where it does not,
       * `supported: false` tells the UI to explain rather than offer a control
       * that cannot work. Adding a second watchlist would be the wrong fix.
       */
      watchlist: {
        supported: signalRow !== null,
        watchlisted: signalRow?.watchlisted ?? false,
        signalId: signalRow?.id ?? null,
      },
    };
  }

  /**
   * Generated financials are development scaffolding and are withheld in
   * production. A fabricated revenue figure attached to a real listed company
   * is worse than an empty state, whatever label sits beside it.
   */
  async getFundamentals(
    ticker: string,
    period: FundamentalPeriod,
  ): Promise<StockFundamentals | null> {
    const data = await this.fundamentals.find(ticker, period);
    if (!data) {
      return null;
    }
    if (data.provenance === "SAMPLE" && process.env.NODE_ENV === "production") {
      return null;
    }
    return data;
  }

  async search(term: string, limit: number): Promise<StockSearchResult[]> {
    const rows = await this.stocks.search(term, limit);
    return this.decorate(rows);
  }

  async mostActive(limit: number): Promise<StockSearchResult[]> {
    const rows = await this.stocks.findMostActive(limit);
    return this.decorate(rows);
  }

  /** Reads through the existing signal watchlist to the tickers behind it. */
  async watchlist(userId: string, limit: number): Promise<StockSearchResult[]> {
    const tickers = await this.stocks.findWatchlistTickers(userId);
    if (tickers.length === 0) {
      return [];
    }

    const found = await Promise.all(
      tickers.slice(0, limit).map((ticker) => this.stocks.search(ticker, 1)),
    );
    return this.decorate(
      found.flat().filter((row) => tickers.includes(row.ticker)),
    );
  }

  coverage() {
    return this.brokers.findCoverage();
  }

  private async decorate(rows: StockSearchRow[]): Promise<StockSearchResult[]> {
    const sparks = await Promise.all(
      rows.map((row) => this.stocks.findRecentCloses(row.ticker, SPARK_SESSIONS)),
    );

    return rows.map((row, index) => ({
      ticker: row.ticker,
      name: row.name,
      lastPrice: row.close,
      changePercent:
        row.close !== null && row.previousClose !== null && row.previousClose !== 0
          ? Math.round(((row.close - row.previousClose) / row.previousClose) * 10000) / 100
          : null,
      spark: sparks[index],
      valueTraded: row.value === null ? null : Number(row.value),
    }));
  }
}

function groupByBroker(rows: BrokerDayRow[]): Map<string, BrokerDayRow[]> {
  const map = new Map<string, BrokerDayRow[]>();
  for (const row of rows) {
    const existing = map.get(row.broker);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.broker, [row]);
    }
  }
  return map;
}

/**
 * The chart draws the biggest movers on both sides, not the top N buyers.
 * A period's story is usually who was accumulating *and* who was selling into
 * it; taking the head of a descending list would only ever show one of them.
 */
function pickChartBrokers(brokers: BrokerFlow[], count: number): string[] {
  if (count >= brokers.length) {
    return brokers.map((broker) => broker.brokerCode);
  }
  const buyers = Math.ceil(count / 2);
  const sellers = count - buyers;

  const top = brokers.slice(0, buyers);
  const bottom = sellers > 0 ? brokers.slice(-sellers) : [];
  return [...top, ...bottom].map((broker) => broker.brokerCode);
}

/**
 * stock_summaries publishes foreign buy and sell in SHARES, so a value has to
 * be implied from the close. It is an approximation and is labelled as one on
 * screen; the exact figure lives in broker_summaries and is what the market
 * overview uses.
 */
function foreignNetValue(
  summary: { foreignBuyShares: string; foreignSellShares: string } | null,
  close: number | null,
): number | null {
  if (!summary || close === null) {
    return null;
  }
  const net = Number(summary.foreignBuyShares) - Number(summary.foreignSellShares);
  return Math.round(net * close);
}

function returnPercent(entryLow: number, entryHigh: number, currentPrice: number): number | null {
  const midpoint = (entryLow + entryHigh) / 2;
  if (midpoint <= 0) {
    return null;
  }
  return Math.round(((currentPrice - midpoint) / midpoint) * 10000) / 100;
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

export const stockAnalysisService: StockAnalysisService = new StockAnalysisServiceImpl(
  brokerAnalysisRepository,
  stockProfileRepository,
  fundamentalsRepository,
);
