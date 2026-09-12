import { db } from "@/database";
import type { SignalModel, SignalEventModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { SignalFilter } from "@/features/signals/signal-types";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/** Just enough of a closed signal to compute win rate and average return. */
export interface ClosedSignalOutcome {
  ticker: string;
  type: SignalModel["type"];
  entryLow: number;
  currentPrice: number;
}

export interface SignalWeeklyCounts {
  targetHit: number;
  stopLoss: number;
}

export interface SignalRepository {
  findMany(filter: SignalFilter): Promise<PaginatedResult<SignalModel>>;
  findById(id: string): Promise<(SignalModel & { event: SignalEventModel[] }) | null>;
  findWatchlistedIds(userId: string): Promise<string[]>;
  countActive(): Promise<number>;
  countWatchlist(userId: string): Promise<number>;
  countWeeklyMilestones(): Promise<SignalWeeklyCounts>;
  findClosedOutcomes(): Promise<ClosedSignalOutcome[]>;
  addToWatchlist(userId: string, signalId: string): Promise<void>;
  removeFromWatchlist(userId: string, signalId: string): Promise<void>;
}

export class PrismaSignalRepository implements SignalRepository {
  async findMany(filter: SignalFilter): Promise<PaginatedResult<SignalModel>> {
    const where = {
      deletedAt: null,
      ...(filter.tab === "history" ? { status: "CLOSED" as const } : {}),
      ...(filter.tab === "active" ? { status: { not: "CLOSED" as const } } : {}),
      ...(filter.tab === "watchlist"
        ? { watchlistItem: { some: { userId: filter.userId } } }
        : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { ticker: { contains: filter.search, mode: "insensitive" as const } },
              { companyName: { contains: filter.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    // Return is derived from two columns, so it cannot be ordered in SQL. Those two
    // sorts read the filtered set and order it here; a curated signal list is small
    // enough that this stays cheap, and every other sort is ordered by the database.
    const sortsInMemory = filter.sort === "return-desc" || filter.sort === "return-asc";

    if (sortsInMemory) {
      const rows = await db.signal.findMany({ where });
      const direction = filter.sort === "return-desc" ? -1 : 1;
      const sorted = rows.sort((a, b) => direction * (returnRatio(a) - returnRatio(b)));
      const start = (filter.page - 1) * filter.pageSize;

      return {
        items: sorted.slice(start, start + filter.pageSize),
        pagination: toPagination(filter, rows.length),
      };
    }

    const [totalItems, items] = await Promise.all([
      db.signal.count({ where }),
      db.signal.findMany({
        where,
        orderBy: toOrderBy(filter.sort),
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
    ]);

    return { items, pagination: toPagination(filter, totalItems) };
  }

  async findById(id: string): Promise<(SignalModel & { event: SignalEventModel[] }) | null> {
    return db.signal.findFirst({
      where: { id, deletedAt: null },
      include: { event: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async findWatchlistedIds(userId: string): Promise<string[]> {
    const items = await db.signalWatchlistItem.findMany({
      where: { userId },
      select: { signalId: true },
    });
    return items.map((item) => item.signalId);
  }

  async countActive(): Promise<number> {
    return db.signal.count({ where: { deletedAt: null, status: { not: "CLOSED" } } });
  }

  async countWatchlist(userId: string): Promise<number> {
    return db.signalWatchlistItem.count({ where: { userId } });
  }

  async countWeeklyMilestones(): Promise<SignalWeeklyCounts> {
    const since = new Date(Date.now() - WEEK_IN_MS);
    const reachedSince = {
      state: "DONE" as const,
      occurredAt: { gte: since },
      signal: { deletedAt: null },
    };

    const [targetHit, stopLoss] = await Promise.all([
      db.signalEvent.count({ where: { ...reachedSince, kind: "TARGET" } }),
      db.signalEvent.count({ where: { ...reachedSince, kind: "STOP_LOSS" } }),
    ]);

    return { targetHit, stopLoss };
  }

  async findClosedOutcomes(): Promise<ClosedSignalOutcome[]> {
    return db.signal.findMany({
      where: { deletedAt: null, status: "CLOSED" },
      select: { ticker: true, type: true, entryLow: true, currentPrice: true },
    });
  }

  async addToWatchlist(userId: string, signalId: string): Promise<void> {
    await db.signalWatchlistItem.upsert({
      where: { userId_signalId: { userId, signalId } },
      update: {},
      create: { userId, signalId },
    });
  }

  async removeFromWatchlist(userId: string, signalId: string): Promise<void> {
    await db.signalWatchlistItem.deleteMany({ where: { userId, signalId } });
  }
}

function returnRatio(signal: SignalModel): number {
  return (signal.currentPrice - signal.entryLow) / signal.entryLow;
}

function toOrderBy(sort: SignalFilter["sort"]) {
  switch (sort) {
    case "oldest":
      return { issuedAt: "asc" as const };
    case "ticker":
      return { ticker: "asc" as const };
    default:
      return { issuedAt: "desc" as const };
  }
}

function toPagination(filter: SignalFilter, totalItems: number) {
  return {
    page: filter.page,
    pageSize: filter.pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / filter.pageSize),
  };
}

export const signalRepository: SignalRepository = new PrismaSignalRepository();
