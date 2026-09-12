import { INDICATORS } from "@/features/market-data/indicator-catalogue";
import type { MarketDataQuery, MarketIndicatorDto } from "@/features/market-data/market-data-types";
import type {
  IndicatorPointRow,
  MarketDataRepository,
} from "@/features/market-data/repository/market-data-repository";
import { marketDataRepository } from "@/features/market-data/repository/market-data-repository";

/** A year, so the 52-week range and the longer chart ranges are real. */
const TREND_DAYS = 400;
/** Calendar days, so the comparison lands on the nearest session a month back. */
const MONTH_DAYS = 30;

/**
 * How far behind the freshest series an indicator may fall before it is hidden.
 *
 * A vendor series can quietly stop updating while still answering with data —
 * the API2 coal contract did exactly that, holding a February price all year.
 * Showing that beside live prices is worse than showing nothing, so anything
 * this stale is dropped and the fetcher reports it.
 */
const MAX_STALE_DAYS = 10;

export interface MarketDataService {
  listIndicators(query: MarketDataQuery): Promise<MarketIndicatorDto[]>;
}

export class MarketDataServiceImpl implements MarketDataService {
  constructor(private readonly repository: MarketDataRepository) {}

  async listIndicators(query: MarketDataQuery): Promise<MarketIndicatorDto[]> {
    const rows = await this.repository.findRecentPoints(TREND_DAYS);

    const bySymbol = new Map<string, IndicatorPointRow[]>();
    for (const row of rows) {
      const series = bySymbol.get(row.symbol);
      if (series) {
        series.push(row);
      } else {
        bySymbol.set(row.symbol, [row]);
      }
    }

    const wanted = query.group
      ? INDICATORS.filter((item) => item.group === query.group)
      : INDICATORS;

    // Freshest date across everything we hold is the reference for staleness.
    const newest = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), "");
    const cutoff = new Date(`${newest || "1970-01-01"}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - MAX_STALE_DAYS);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    return wanted
      .map((definition) => toIndicator(definition, bySymbol.get(definition.code) ?? []))
      .filter((indicator) => indicator === null || indicator.latestDate >= cutoffIso)
      // An indicator with no data yet is omitted rather than rendered as a
      // dash: the page should show what it actually has.
      .filter((indicator): indicator is MarketIndicatorDto => indicator !== null);
  }
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function percentChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || from === 0) {
    return null;
  }
  return Math.round(((to - from) / from) * 10000) / 100;
}

function toIndicator(
  definition: (typeof INDICATORS)[number],
  series: IndicatorPointRow[],
): MarketIndicatorDto | null {
  if (series.length === 0) {
    return null;
  }

  const last = series[series.length - 1];
  const previous = series[series.length - 2];

  // Nearest session on or before a month ago, rather than "30 rows back" —
  // series have different trading calendars and holidays.
  const monthCutoff = new Date(`${last.date}T00:00:00Z`);
  monthCutoff.setUTCDate(monthCutoff.getUTCDate() - MONTH_DAYS);
  const cutoffIso = monthCutoff.toISOString().slice(0, 10);
  const monthAgo = [...series].reverse().find((row) => row.date <= cutoffIso);

  const closes = series.map((row) => row.close);

  return {
    code: definition.code,
    label: definition.label,
    description: definition.description,
    group: definition.group,
    category: definition.category,
    unit: definition.unit,
    decimals: definition.decimals,
    invertTone: definition.invertTone ?? false,
    latest: last.close,
    latestDate: last.date,
    dailyChangePercent: previous ? percentChange(previous.close, last.close) : null,
    monthChangePercent: monthAgo ? percentChange(monthAgo.close, last.close) : null,
    previousClose: previous?.close ?? null,
    changeAbsolute: previous ? round6(last.close - previous.close) : null,
    // Day range comes from the session's own OHLC where the vendor sends it;
    // a close is not a range, so it is not substituted for one.
    dayHigh: last.high,
    dayLow: last.low,
    week52High: closes.length > 0 ? Math.max(...closes) : null,
    week52Low: closes.length > 0 ? Math.min(...closes) : null,
    series: series.map((row) => ({ date: row.date, close: row.close })),
  };
}

export const marketDataService: MarketDataService = new MarketDataServiceImpl(
  marketDataRepository,
);
