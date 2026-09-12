import { INDICATORS } from "@/features/market-data/indicator-catalogue";
import type { MarketDataQuery, MarketIndicatorDto } from "@/features/market-data/market-data-types";
import type {
  IndicatorPointRow,
  MarketDataRepository,
} from "@/features/market-data/repository/market-data-repository";
import { marketDataRepository } from "@/features/market-data/repository/market-data-repository";

/** The trend window the sparkline and the 1M column are read from. */
const TREND_DAYS = 95;
/** Calendar days, so the comparison lands on the nearest session a month back. */
const MONTH_DAYS = 30;

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

    return wanted
      .map((definition) => toIndicator(definition, bySymbol.get(definition.code) ?? []))
      // An indicator with no data yet is omitted rather than rendered as a
      // dash: the page should show what it actually has.
      .filter((indicator): indicator is MarketIndicatorDto => indicator !== null);
  }
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
    spark: series.map((row) => row.close),
  };
}

export const marketDataService: MarketDataService = new MarketDataServiceImpl(
  marketDataRepository,
);
