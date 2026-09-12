import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { PaginatedResult } from "@/lib/api/pagination";
import { toSignalDetailDto, toSignalRowDto } from "@/features/signals/signal-mappers";
import type {
  SignalDetailDto,
  SignalFilter,
  SignalPerformanceDto,
  SignalRowDto,
  SignalStatsDto,
  SignalType,
  SignalTypePerformanceDto,
} from "@/features/signals/signal-types";
import type {
  ClosedSignalOutcome,
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
