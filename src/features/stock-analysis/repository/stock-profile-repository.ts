import { db } from "@/database";
import type { SignalStatusKind } from "@/database/prisma/enums";

/**
 * What the app knows about a listing.
 *
 * Split across three sources, all of them already here: t_stock for the name,
 * stock_summaries for everything the daily IDX summary carries, and t_signal /
 * t_discussion_thread for the links back into the rest of Piranha.
 *
 * stock_summaries.volume is in SHARES, unlike broker_summaries which is in
 * lots. The service converts; nothing downstream should have to remember.
 */
export interface StockSummaryRow {
  date: string;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  volumeShares: string;
  value: string;
  foreignBuyShares: string;
  foreignSellShares: string;
  listedShares: string | null;
  tradeableShares: string | null;
  updatedAt: Date | null;
}

export interface YearRangeRow {
  high: number | null;
  low: number | null;
}

export interface StockSearchRow {
  ticker: string;
  name: string | null;
  close: number | null;
  previousClose: number | null;
  value: string | null;
}

export interface StockProfileRepository {
  findName(ticker: string): Promise<string | null>;
  findLatestSummary(ticker: string): Promise<StockSummaryRow | null>;
  findYearRange(ticker: string): Promise<YearRangeRow | null>;
  findRecentCloses(ticker: string, days: number): Promise<number[]>;
  search(term: string, limit: number): Promise<StockSearchRow[]>;
  findMostActive(limit: number): Promise<StockSearchRow[]>;
  findSignalForTicker(
    ticker: string,
    userId: string,
  ): Promise<{
    id: string;
    type: string;
    status: SignalStatusKind;
    entryLow: number;
    entryHigh: number;
    currentPrice: number;
    target1: number;
    target2: number | null;
    stopLoss: number;
    watchlisted: boolean;
  } | null>;
  findDiscussionsForTicker(
    ticker: string,
    limit: number,
  ): Promise<Array<{ id: string; title: string; category: string; commentCount: number }>>;
  findWatchlistTickers(userId: string): Promise<string[]>;
}

export class SqlStockProfileRepository implements StockProfileRepository {
  async findName(ticker: string): Promise<string | null> {
    const stock = await db.stock.findUnique({ where: { ticker }, select: { name: true } });
    return stock?.name ?? null;
  }

  async findLatestSummary(ticker: string): Promise<StockSummaryRow | null> {
    const rows = await db.$queryRaw<StockSummaryRow[]>`
      SELECT date::text AS date,
             previous_close::float8   AS "previousClose",
             open_price::float8       AS "open",
             high::float8             AS "high",
             low::float8              AS "low",
             close::float8            AS "close",
             change::float8           AS "change",
             COALESCE(volume, 0)::text          AS "volumeShares",
             COALESCE(value, 0)::text           AS "value",
             COALESCE(foreign_buy, 0)::text     AS "foreignBuyShares",
             COALESCE(foreign_sell, 0)::text    AS "foreignSellShares",
             listed_shares::text      AS "listedShares",
             tradeable_shares::text   AS "tradeableShares",
             COALESCE(updated_at, created_at) AS "updatedAt"
      FROM stock_summaries
      WHERE ticker = ${ticker}
      ORDER BY date DESC
      LIMIT 1`;
    return rows[0] ?? null;
  }

  /*
   * "52-week" is aspirational: the ingestion holds a few months so far, and
   * this returns the range of what exists. The service says how many sessions
   * it covers rather than letting the label claim a year.
   */
  async findYearRange(ticker: string): Promise<YearRangeRow | null> {
    const rows = await db.$queryRaw<YearRangeRow[]>`
      SELECT max(high)::float8 AS high, min(low)::float8 AS low
      FROM stock_summaries
      WHERE ticker = ${ticker}
        AND date >= (SELECT max(date) FROM stock_summaries) - 365`;
    return rows[0] ?? null;
  }

  async findRecentCloses(ticker: string, days: number): Promise<number[]> {
    const rows = await db.$queryRaw<Array<{ close: number }>>`
      SELECT close::float8 AS close
      FROM stock_summaries
      WHERE ticker = ${ticker} AND close IS NOT NULL
      ORDER BY date DESC
      LIMIT ${days}`;
    return rows.map((row) => row.close).reverse();
  }

  /*
   * Ticker first, then name. A member typing "BB" wants BBCA before
   * "Bank Syariah", so an exact ticker match sorts above a prefix match, which
   * sorts above a name match.
   */
  async search(term: string, limit: number): Promise<StockSearchRow[]> {
    const like = `%${term}%`;
    const prefix = `${term}%`;

    return db.$queryRaw<StockSearchRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON (ticker) ticker, close::float8 AS close,
               previous_close::float8 AS "previousClose", value::text AS value
        FROM stock_summaries
        ORDER BY ticker, date DESC
      )
      SELECT l.ticker, s.name, l.close, l."previousClose", l.value
      FROM latest l
      LEFT JOIN t_stock s ON s.ticker = l.ticker
      WHERE l.ticker ILIKE ${like} OR s.name ILIKE ${like}
      ORDER BY
        CASE WHEN l.ticker = ${term} THEN 0
             WHEN l.ticker ILIKE ${prefix} THEN 1
             WHEN s.name ILIKE ${prefix} THEN 2
             ELSE 3 END,
        -- ::numeric, not the text column: sorted as text "999" beats
        -- "1000000000" and the most liquid names sink to the bottom.
        l.value::numeric DESC NULLS LAST,
        l.ticker ASC
      LIMIT ${limit}`;
  }

  /** By value traded on the latest session — the liquid end of the board. */
  async findMostActive(limit: number): Promise<StockSearchRow[]> {
    return db.$queryRaw<StockSearchRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON (ticker) ticker, close::float8 AS close,
               previous_close::float8 AS "previousClose", value::text AS value
        FROM stock_summaries
        WHERE date = (SELECT max(date) FROM stock_summaries)
        ORDER BY ticker, date DESC
      )
      SELECT l.ticker, s.name, l.close, l."previousClose", l.value
      FROM latest l
      LEFT JOIN t_stock s ON s.ticker = l.ticker
      ORDER BY l.value::numeric DESC NULLS LAST
      LIMIT ${limit}`;
  }

  /*
   * The live signal for this ticker, if Piranha has published one. Read from
   * the Signals module's own tables — Stock Analysis links to a signal, it
   * never stores one.
   */
  async findSignalForTicker(ticker: string, userId: string) {
    const signal = await db.signal.findFirst({
      where: { ticker, deletedAt: null },
      orderBy: [{ status: "asc" }, { issuedAt: "desc" }],
      select: {
        id: true,
        type: true,
        status: true,
        entryLow: true,
        entryHigh: true,
        currentPrice: true,
        target1: true,
        target2: true,
        stopLoss: true,
        watchlistItem: { where: { userId }, select: { id: true } },
      },
    });
    if (!signal) {
      return null;
    }

    const { watchlistItem, ...rest } = signal;
    return { ...rest, watchlisted: watchlistItem.length > 0 };
  }

  async findDiscussionsForTicker(ticker: string, limit: number) {
    const rows = await db.discussionThread.findMany({
      where: { deletedAt: null, status: "PUBLISHED", tickers: { has: ticker } },
      orderBy: [{ publishedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        _count: { select: { reply: { where: { deletedAt: null } } } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      commentCount: row._count.reply,
    }));
  }

  /*
   * The tickers behind the member's watchlist.
   *
   * Piranha's watchlist holds signals, so this reads through to each signal's
   * ticker rather than introducing a watchlist of its own.
   */
  async findWatchlistTickers(userId: string): Promise<string[]> {
    const rows = await db.signalWatchlistItem.findMany({
      where: { userId, signal: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { signal: { select: { ticker: true } } },
    });
    return [...new Set(rows.map((row) => row.signal.ticker))];
  }
}

export const stockProfileRepository: StockProfileRepository = new SqlStockProfileRepository();
