import { db } from "@/database";
import { Prisma } from "@/database/prisma/client";
import type { MarketBoard } from "@/features/stock-analysis/stock-analysis-types";

/**
 * Broker-level aggregates straight from the IDX ingestion.
 *
 * broker_summaries is ingested market data and lives outside the Prisma
 * datamodel, like its neighbours, so it is read with $queryRaw.
 *
 * THREE THINGS THIS FILE KNOWS THAT NOTHING ELSE SHOULD HAVE TO:
 *   1. `is_net = false` rows are the gross buy and sell sides. The `is_net`
 *      rows are IDX's own netting and would double-count if mixed in.
 *   2. `volume` is in LOTS here, unlike stock_summaries which is in shares.
 *   3. `txn_type` is the board: RG regular, NG negotiated.
 *
 * Aggregation happens in the database. A quarter of BBCA is roughly five
 * thousand broker-day rows out and about a hundred milliseconds; the raw
 * transaction rows behind them never leave Postgres.
 */
export interface BrokerDayRow {
  broker: string;
  date: string;
  buyValue: string;
  sellValue: string;
  buyLots: string;
  sellLots: string;
}

export interface DailyCloseRow {
  date: string;
  close: number;
}

export interface BrokerAnalysisRepository {
  findBrokerDays(
    ticker: string,
    startDate: string,
    endDate: string,
    board: MarketBoard,
  ): Promise<BrokerDayRow[]>;
  findDailyCloses(ticker: string, startDate: string, endDate: string): Promise<DailyCloseRow[]>;
  findLatestIngestAt(ticker: string): Promise<string | null>;
  findCoverage(): Promise<{ earliest: string; latest: string } | null>;
}

export class SqlBrokerAnalysisRepository implements BrokerAnalysisRepository {
  async findBrokerDays(
    ticker: string,
    startDate: string,
    endDate: string,
    board: MarketBoard,
  ): Promise<BrokerDayRow[]> {
    // Values are summed as numeric and returned as text: a quarter of turnover
    // on a large listing exceeds what a float64 can hold exactly, and a price
    // that rounds differently on screen than in the database is a bug report.
    const boardFilter =
      board === "ALL" ? Prisma.empty : Prisma.sql`AND txn_type = ${board}`;

    return db.$queryRaw<BrokerDayRow[]>`
      SELECT broker,
             date::text AS date,
             COALESCE(sum(value)  FILTER (WHERE action = 'BUY'),  0)::text AS "buyValue",
             COALESCE(sum(value)  FILTER (WHERE action = 'SELL'), 0)::text AS "sellValue",
             COALESCE(sum(volume) FILTER (WHERE action = 'BUY'),  0)::text AS "buyLots",
             COALESCE(sum(volume) FILTER (WHERE action = 'SELL'), 0)::text AS "sellLots"
      FROM broker_summaries
      WHERE ticker = ${ticker}
        AND is_net = false
        AND date BETWEEN ${startDate}::date AND ${endDate}::date
        ${boardFilter}
      GROUP BY broker, date
      ORDER BY date ASC, broker ASC`;
  }

  async findDailyCloses(
    ticker: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyCloseRow[]> {
    return db.$queryRaw<DailyCloseRow[]>`
      SELECT date::text AS date, close::float8 AS close
      FROM stock_summaries
      WHERE ticker = ${ticker}
        AND date BETWEEN ${startDate}::date AND ${endDate}::date
        AND close IS NOT NULL
      ORDER BY date ASC`;
  }

  /** When the ingestion last wrote a row for this ticker, for the freshness line. */
  async findLatestIngestAt(ticker: string): Promise<string | null> {
    const rows = await db.$queryRaw<Array<{ at: Date | null }>>`
      SELECT max(created_at) AS at
      FROM broker_summaries
      WHERE ticker = ${ticker}`;
    return rows[0]?.at?.toISOString() ?? null;
  }

  /** The window the ingestion actually covers, so the UI can bound its pickers. */
  async findCoverage(): Promise<{ earliest: string; latest: string } | null> {
    const rows = await db.$queryRaw<Array<{ earliest: string | null; latest: string | null }>>`
      SELECT min(date)::text AS earliest, max(date)::text AS latest FROM broker_summaries`;
    const row = rows[0];
    if (!row?.earliest || !row.latest) {
      return null;
    }
    return { earliest: row.earliest, latest: row.latest };
  }
}

export const brokerAnalysisRepository: BrokerAnalysisRepository =
  new SqlBrokerAnalysisRepository();
