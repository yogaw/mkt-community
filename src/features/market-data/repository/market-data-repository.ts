import { db } from "@/database";

/**
 * market_indicator_point is ingested market data and lives outside the Prisma
 * datamodel, like its neighbours, so it is read with $queryRaw. One query
 * returns every series; eighteen indicators over a quarter is around a
 * thousand rows, which is cheaper to group in memory than to round-trip
 * eighteen times.
 */
export interface IndicatorPointRow {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
}

export interface MarketDataRepository {
  findRecentPoints(days: number): Promise<IndicatorPointRow[]>;
}

export class SqlMarketDataRepository implements MarketDataRepository {
  async findRecentPoints(days: number): Promise<IndicatorPointRow[]> {
    return db.$queryRaw<IndicatorPointRow[]>`
      SELECT symbol, date::text AS date,
             open::float8 AS open, high::float8 AS high,
             low::float8 AS low, close::float8 AS close
      FROM market_indicator_point
      WHERE date >= (SELECT max(date) FROM market_indicator_point) - ${days}::int
      ORDER BY symbol ASC, date ASC`;
  }
}

export const marketDataRepository: MarketDataRepository = new SqlMarketDataRepository();
