import {
  INSTRUMENTS,
  isVisibleInEnvironment,
  type InstrumentDefinition,
} from "@/features/market-data/catalogue/instruments";
import { sampleSeries } from "@/features/market-data/mock/sample-series";
import type {
  HistoryPoint,
  Instrument,
  MarketSection,
} from "@/features/market-data/market-data-model";
import type {
  IndicatorPointRow,
  MarketDataRepository,
} from "@/features/market-data/repository/market-data-repository";
import { marketDataRepository } from "@/features/market-data/repository/market-data-repository";

/** A year, so 52-week ranges and the longer timeframes are real. */
const HISTORY_DAYS = 400;
const SAMPLE_SESSIONS = 260;

/**
 * Anything lagging the freshest connected series by more than this is treated
 * as stale and flagged. A vendor contract can quietly stop updating while still
 * answering — the API2 coal series did exactly that.
 */
const STALE_AFTER_DAYS = 10;

export interface InstrumentService {
  listBySection(section: MarketSection): Promise<Instrument[]>;
}

export class InstrumentServiceImpl implements InstrumentService {
  constructor(private readonly repository: MarketDataRepository) {}

  async listBySection(section: MarketSection): Promise<Instrument[]> {
    const rows = await this.repository.findRecentPoints(HISTORY_DAYS);

    const bySymbol = new Map<string, IndicatorPointRow[]>();
    for (const row of rows) {
      const series = bySymbol.get(row.symbol);
      if (series) {
        series.push(row);
      } else {
        bySymbol.set(row.symbol, [row]);
      }
    }

    // The freshest connected observation anchors both staleness and the sample
    // calendar, so generated series line up with real ones on the same axis.
    const anchor =
      rows.reduce((latest, row) => (row.date > latest ? row.date : latest), "") ||
      new Date().toISOString().slice(0, 10);

    const isProduction = process.env.NODE_ENV === "production";

    return INSTRUMENTS.filter((item) => item.market === section)
      .filter((item) => isVisibleInEnvironment(item, isProduction))
      .map((definition) => toInstrument(definition, bySymbol, anchor))
      .filter((instrument): instrument is Instrument => instrument !== null);
  }
}

function toInstrument(
  definition: InstrumentDefinition,
  bySymbol: Map<string, IndicatorPointRow[]>,
  anchor: string,
): Instrument | null {
  let history: HistoryPoint[];
  let dayLow: number | null = null;
  let dayHigh: number | null = null;

  if (definition.feed.kind === "db") {
    const rows = bySymbol.get(definition.feed.code) ?? [];
    if (rows.length === 0) {
      return null;
    }
    // A series that stopped updating is dropped rather than shown as current.
    const last = rows[rows.length - 1];
    if (daysBetween(last.date, anchor) > STALE_AFTER_DAYS) {
      return null;
    }
    history = rows.map((row) => ({ date: row.date, close: row.close }));
    dayLow = last.low;
    dayHigh = last.high;
  } else {
    history = sampleSeries(definition.symbol, definition.feed, SAMPLE_SESSIONS, anchor);
  }

  const last = history[history.length - 1];
  const previous = history[history.length - 2] ?? null;
  const closes = history.map((point) => point.close);

  const change = previous ? round6(last.close - previous.close) : null;
  const changePercent =
    previous && previous.close !== 0
      ? Math.round(((last.close - previous.close) / previous.close) * 10000) / 100
      : null;

  return {
    symbol: definition.symbol,
    name: definition.name,
    category: definition.category,
    market: definition.market,
    benchmark: definition.benchmark ?? null,
    exchange: definition.exchange ?? null,
    currency: definition.currency,
    unit: definition.unit ?? null,
    decimals: definition.decimals,

    value: last.close,
    change,
    changePercent,
    previousClose: previous?.close ?? null,
    dayLow,
    dayHigh,
    yearLow: closes.length > 0 ? Math.min(...closes) : null,
    yearHigh: closes.length > 0 ? Math.max(...closes) : null,

    source: definition.source,
    dataStatus: definition.dataStatus,
    delayMinutes: definition.delayMinutes ?? null,
    timestamp: last.date,

    invertTone: definition.invertTone ?? false,
    preferBasisPoints: definition.preferBasisPoints ?? false,
    history,
  };
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export const instrumentService: InstrumentService = new InstrumentServiceImpl(
  marketDataRepository,
);
