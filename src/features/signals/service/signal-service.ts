import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { PaginatedResult } from "@/lib/api/pagination";
import { toSignalDetailDto, toSignalRowDto } from "@/features/signals/signal-mappers";
import { advanceStatus, initialStatus, type SignalLevels } from "@/features/signals/signal-status";
import type {
  CreateSignalInput,
  SignalDetailDto,
  SignalFilter,
  SignalStatus,
  StockOptionDto,
  StocksQuery,
  UpdateSignalPriceInput,
  SignalPerformanceDto,
  SignalRowDto,
  SignalStatsDto,
  SignalType,
  SignalTypePerformanceDto,
} from "@/features/signals/signal-types";
import type {
  ClosedSignalOutcome,
  NewSignalData,
  NewSignalEvent,
  SignalRepository,
} from "@/features/signals/repository/signal-repository";
import { signalRepository } from "@/features/signals/repository/signal-repository";

const SIGNAL_TYPES: SignalType[] = ["SWING", "TRADING", "POSITION"];

export interface SignalListResult extends PaginatedResult<SignalRowDto> {
  stats: SignalStatsDto;
}

export interface SignalService {
  listSignals(filter: SignalFilter): Promise<SignalListResult>;
  getSignalById(id: string, userId: string): Promise<SignalDetailDto>;
  createSignal(input: CreateSignalInput, userId: string): Promise<SignalDetailDto>;
  updateSignalPrice(
    id: string,
    input: UpdateSignalPriceInput,
    userId: string,
  ): Promise<SignalDetailDto>;
  listStocks(query: StocksQuery): Promise<StockOptionDto[]>;
  getPerformance(): Promise<SignalPerformanceDto>;
  setWatchlisted(userId: string, signalId: string, watchlisted: boolean): Promise<void>;
}

export class SignalServiceImpl implements SignalService {
  constructor(private readonly repository: SignalRepository) {}

  async listSignals(filter: SignalFilter): Promise<SignalListResult> {
    const normalizedFilter: SignalFilter = {
      ...filter,
      search: filter.search?.trim() || undefined,
    };

    const [page, watchlistedIds, stats] = await Promise.all([
      this.repository.findMany(normalizedFilter),
      this.repository.findWatchlistedIds(filter.userId),
      this.buildStats(filter.userId),
    ]);

    const watchlisted = new Set(watchlistedIds);

    return {
      items: page.items.map((signal) => toSignalRowDto(signal, watchlisted.has(signal.id))),
      pagination: page.pagination,
      stats,
    };
  }

  async getSignalById(id: string, userId: string): Promise<SignalDetailDto> {
    const [signal, watchlistedIds] = await Promise.all([
      this.repository.findById(id),
      this.repository.findWatchlistedIds(userId),
    ]);

    if (!signal) {
      throw new AppError(404, ErrorCode.notFound);
    }

    return toSignalDetailDto(signal, watchlistedIds.includes(signal.id));
  }

  async createSignal(input: CreateSignalInput, userId: string): Promise<SignalDetailDto> {
    // The company name comes from the stock list rather than the form, so a
    // signal can only ever be published against a real listing.
    const stock = await this.repository.findStockByTicker(input.ticker);
    if (!stock) {
      throw new AppError(400, ErrorCode.validation, "ticker");
    }

    const status = initialStatus(input.currentPrice, toLevels(input));
    const data: NewSignalData = { ...input, companyName: stock.name, status };
    const created = await this.repository.create(data, toOpeningTimeline(data));

    // Re-read so the response carries the timeline the same shape the detail
    // endpoint returns, rather than a second hand-built version of it.
    return this.getSignalById(created.id, userId);
  }

  /**
   * Posts the day's close. The close decides the status — it is never sent by
   * the client — and any milestone it newly reaches is appended to the timeline.
   */
  async updateSignalPrice(
    id: string,
    input: UpdateSignalPriceInput,
    userId: string,
  ): Promise<SignalDetailDto> {
    const signal = await this.repository.findById(id);
    if (!signal) {
      throw new AppError(404, ErrorCode.notFound);
    }

    const levels = toLevels(signal);
    const nextStatus = advanceStatus(signal.status, input.currentPrice, levels);

    await this.repository.updatePrice(id, input.currentPrice, nextStatus);

    if (nextStatus !== signal.status) {
      for (const milestone of reachedMilestones(signal.status, nextStatus, input.currentPrice)) {
        await this.repository.markEventReached(
          id,
          milestone.title,
          milestone.detail,
          milestone.occurredAt,
        );
      }
    }

    return this.getSignalById(id, userId);
  }

  async listStocks(query: StocksQuery): Promise<StockOptionDto[]> {
    const stocks = await this.repository.findStocks(query);
    return stocks.map((stock) => ({ ticker: stock.ticker, name: stock.name }));
  }

  async getPerformance(): Promise<SignalPerformanceDto> {
    const outcomes = await this.repository.findClosedOutcomes();
    const scored = outcomes.map(toScoredOutcome);
    const wins = scored.filter((outcome) => outcome.isWin);
    const losses = scored.filter((outcome) => !outcome.isWin);
    const ranked = [...scored].sort((a, b) => b.returnPercent - a.returnPercent);

    return {
      closed: scored.length,
      wins: wins.length,
      losses: losses.length,
      winRatePercent: toWinRate(wins.length, scored.length),
      averageReturnPercent: toAverage(scored.map((outcome) => outcome.returnPercent)),
      averageWinPercent: toAverage(wins.map((outcome) => outcome.returnPercent)),
      averageLossPercent: toAverage(losses.map((outcome) => outcome.returnPercent)),
      best: ranked.length > 0 ? toHighlight(ranked[0]) : null,
      worst: ranked.length > 0 ? toHighlight(ranked[ranked.length - 1]) : null,
      byType: SIGNAL_TYPES.map((type) => toTypePerformance(type, scored)).filter(
        (row) => row.closed > 0,
      ),
    };
  }

  async setWatchlisted(userId: string, signalId: string, watchlisted: boolean): Promise<void> {
    // Confirms the signal exists before writing, so a bad id is a 404 rather
    // than a foreign-key error surfacing as a 500.
    const signal = await this.repository.findById(signalId);
    if (!signal) {
      throw new AppError(404, ErrorCode.notFound);
    }

    if (watchlisted) {
      await this.repository.addToWatchlist(userId, signalId);
      return;
    }
    await this.repository.removeFromWatchlist(userId, signalId);
  }

  private async buildStats(userId: string): Promise<SignalStatsDto> {
    const [activeCount, watchlistCount, weekly, outcomes] = await Promise.all([
      this.repository.countActive(),
      this.repository.countWatchlist(userId),
      this.repository.countWeeklyMilestones(),
      this.repository.findClosedOutcomes(),
    ]);

    const scored = outcomes.map(toScoredOutcome);
    const wins = scored.filter((outcome) => outcome.isWin).length;

    return {
      activeCount,
      watchlistCount,
      targetHitThisWeek: weekly.targetHit,
      stopLossThisWeek: weekly.stopLoss,
      winRatePercent: toWinRate(wins, scored.length),
      wins,
      losses: scored.length - wins,
    };
  }
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * The timeline a signal starts life with: the entry that was taken, each
 * target still to come, and the stop standing guard underneath.
 */
function toOpeningTimeline(input: NewSignalData): NewSignalEvent[] {
  const reachedTp1 = input.status === "TP1_HIT" || input.status === "TP2_HIT";
  const reachedTp2 = input.status === "TP2_HIT";
  const stopped = input.status === "STOP_LOSS";

  const events: Array<Omit<NewSignalEvent, "sortOrder">> = [
    {
      kind: "ENTRY",
      state: "DONE",
      title: "Signal issued",
      detail: `${input.ticker} at ${formatPrice(input.entryLow)} – ${formatPrice(input.entryHigh)}`,
      occurredAt: input.issuedAt,
    },
    {
      kind: "TARGET",
      state: reachedTp1 ? "DONE" : "PENDING",
      title: "Target 1",
      detail: reachedTp1 ? formatPrice(input.target1) : `${formatPrice(input.target1)} (pending)`,
      occurredAt: null,
    },
  ];

  if (input.target2 !== null) {
    events.push({
      kind: "TARGET",
      state: reachedTp2 ? "DONE" : "PENDING",
      title: "Target 2",
      detail: reachedTp2 ? formatPrice(input.target2) : `${formatPrice(input.target2)} (pending)`,
      occurredAt: null,
    });
  }

  events.push({
    kind: "STOP_LOSS",
    state: stopped ? "DONE" : "ACTIVE",
    title: "Stop Loss",
    detail: formatPrice(input.stopLoss),
    occurredAt: null,
  });

  return events.map((event, index) => ({ ...event, sortOrder: index }));
}

function toLevels(signal: SignalLevels): SignalLevels {
  return { target1: signal.target1, target2: signal.target2, stopLoss: signal.stopLoss };
}

/**
 * The milestone rows a new close just turned from pending into fact. The
 * opening timeline already holds a row for each one, so these are updates
 * rather than additions, and a close that clears both targets at once marks
 * both.
 */
function reachedMilestones(
  previous: SignalStatus,
  next: SignalStatus,
  close: number,
): Array<{ title: string; detail: string; occurredAt: Date }> {
  const occurredAt = new Date();
  const reached: Array<{ title: string; detail: string; occurredAt: Date }> = [];

  if (next === "STOP_LOSS") {
    return [{ title: "Stop Loss", detail: `Stopped out at ${formatPrice(close)}`, occurredAt }];
  }

  if (previous === "ACTIVE" && (next === "TP1_HIT" || next === "TP2_HIT")) {
    reached.push({ title: "Target 1", detail: `Reached at ${formatPrice(close)}`, occurredAt });
  }
  if (next === "TP2_HIT") {
    reached.push({ title: "Target 2", detail: `Reached at ${formatPrice(close)}`, occurredAt });
  }

  return reached;
}

interface ScoredOutcome extends ClosedSignalOutcome {
  returnPercent: number;
  isWin: boolean;
}

function toScoredOutcome(outcome: ClosedSignalOutcome): ScoredOutcome {
  const ratio = (outcome.currentPrice - outcome.entryLow) / outcome.entryLow;
  return {
    ...outcome,
    returnPercent: Math.round(ratio * 1000) / 10,
    isWin: outcome.currentPrice >= outcome.entryLow,
  };
}

function toWinRate(wins: number, total: number): number {
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

function toAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function toHighlight(outcome: ScoredOutcome) {
  return { ticker: outcome.ticker, returnPercent: outcome.returnPercent };
}

function toTypePerformance(type: SignalType, scored: ScoredOutcome[]): SignalTypePerformanceDto {
  const rows = scored.filter((outcome) => outcome.type === type);
  const wins = rows.filter((outcome) => outcome.isWin).length;

  return {
    type,
    closed: rows.length,
    wins,
    winRatePercent: toWinRate(wins, rows.length),
    averageReturnPercent: toAverage(rows.map((outcome) => outcome.returnPercent)),
  };
}

export const signalService: SignalService = new SignalServiceImpl(signalRepository);
