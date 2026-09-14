import { db } from "@/database";
import type {
  ForeignFlowPointDto,
  ForeignFlowQuery,
  MarketScope,
} from "@/features/market-overview/market-overview-types";

/*
 * index_summaries and market_flow_daily are ingested market data and live
 * outside the Prisma datamodel, like stock_summaries and broker_summaries, so
 * they are read with $queryRaw. The raw SQL is confined to this file.
 *
 * Postgres returns bigint as string through the driver (values here exceed
 * 2^53), so every numeric column is cast in SQL and converted deliberately
 * below rather than being trusted to arrive as a number.
 */

export interface IndexSummaryRow {
  date: string;
  close: number;
  previous: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  volume: number | null;
  value: number | null;
  frequency: number | null;
  number_of_stock: number | null;
  market_capital: number | null;
}

export interface FlowRow {
  scope: MarketScope;
  total_value: number;
  total_volume: number;
  foreign_buy_value: number;
  foreign_sell_value: number;
  foreign_net_value: number;
  foreign_buy_volume: number;
  foreign_sell_volume: number;
  foreign_net_volume: number;
}

/** float8 is exact to 2^53; every column below is far inside that except
 *  market_capital, which IDX already sends as an inexact float. */
const INDEX_COLUMNS = `
  date::text AS date,
  close::float8 AS close,
  previous::float8 AS previous,
  high::float8 AS high,
  low::float8 AS low,
  change::float8 AS change,
  volume::float8 AS volume,
  value::float8 AS value,
  frequency::float8 AS frequency,
  number_of_stock AS number_of_stock,
  market_capital::float8 AS market_capital`;

export interface MarketOverviewRepository {
  findLatestDate(): Promise<string | null>;
  findIndexSummary(date: string): Promise<IndexSummaryRow | null>;
  findFlows(date: string): Promise<FlowRow[]>;
  findAdjacentDates(date: string): Promise<{ previous: string | null; next: string | null }>;
  findFlowSeries(query: ForeignFlowQuery): Promise<ForeignFlowPointDto[]>;
}

export class SqlMarketOverviewRepository implements MarketOverviewRepository {
  async findLatestDate(): Promise<string | null> {
    // The newest day that has BOTH an index row and flows, so the page never
    // opens on a date one half of the card cannot fill.
    const rows = await db.$queryRaw<Array<{ date: string }>>`
      SELECT i.date::text AS date
      FROM index_summaries i
      WHERE EXISTS (SELECT 1 FROM market_flow_daily f WHERE f.date = i.date)
      ORDER BY i.date DESC
      LIMIT 1`;
    return rows[0]?.date ?? null;
  }

  async findIndexSummary(date: string): Promise<IndexSummaryRow | null> {
    const rows = await db.$queryRawUnsafe<IndexSummaryRow[]>(
      `SELECT ${INDEX_COLUMNS} FROM index_summaries WHERE date = $1::date`,
      date,
    );
    return rows[0] ?? null;
  }

  async findFlows(date: string): Promise<FlowRow[]> {
    return db.$queryRaw<FlowRow[]>`
      SELECT scope,
             total_value::float8        AS total_value,
             total_volume::float8       AS total_volume,
             foreign_buy_value::float8  AS foreign_buy_value,
             foreign_sell_value::float8 AS foreign_sell_value,
             foreign_net_value::float8  AS foreign_net_value,
             foreign_buy_volume::float8 AS foreign_buy_volume,
             foreign_sell_volume::float8 AS foreign_sell_volume,
             foreign_net_volume::float8 AS foreign_net_volume
      FROM market_flow_daily
      WHERE date = ${date}::date`;
  }

  /**
   * Neighbouring TRADING days, not calendar days: the answer comes from the
   * dates we actually hold, so Friday's next is Monday and a holiday is simply
   * absent from the sequence.
   */
  async findAdjacentDates(date: string): Promise<{ previous: string | null; next: string | null }> {
    const rows = await db.$queryRaw<Array<{ previous: string | null; next: string | null }>>`
      SELECT
        (SELECT date::text FROM index_summaries WHERE date < ${date}::date ORDER BY date DESC LIMIT 1) AS previous,
        (SELECT date::text FROM index_summaries WHERE date > ${date}::date ORDER BY date ASC  LIMIT 1) AS next`;
    return { previous: rows[0]?.previous ?? null, next: rows[0]?.next ?? null };
  }

  async findFlowSeries(query: ForeignFlowQuery): Promise<ForeignFlowPointDto[]> {
    // The index join is LEFT so a flow day never vanishes from the chart just
    // because its index row has not been fetched yet; the line simply breaks.
    // Written out twice rather than composed: Prisma's tagged template is what
    // parameterises these, and a composed fragment would not be.
    const rows = query.from
      ? await db.$queryRaw<RawPoint[]>`
          SELECT f.date::text AS date,
                 f.foreign_net_value::float8  AS net_value,
                 f.foreign_buy_value::float8  AS buy_value,
                 f.foreign_sell_value::float8 AS sell_value,
                 f.total_value::float8        AS total_value,
                 i.close::float8    AS ihsg_close,
                 i.change::float8   AS ihsg_change,
                 i.previous::float8 AS ihsg_previous
          FROM market_flow_daily f
          LEFT JOIN index_summaries i ON i.date = f.date
          WHERE f.scope = ${query.scope}
            AND f.date >= ${query.from}::date
            AND (${query.to ?? null}::date IS NULL OR f.date <= ${query.to ?? null}::date)
          ORDER BY f.date ASC`
      : await db.$queryRaw<RawPoint[]>`
          SELECT * FROM (
            SELECT f.date::text AS date,
                   f.foreign_net_value::float8  AS net_value,
                   f.foreign_buy_value::float8  AS buy_value,
                   f.foreign_sell_value::float8 AS sell_value,
                   f.total_value::float8        AS total_value,
                   i.close::float8    AS ihsg_close,
                   i.change::float8   AS ihsg_change,
                   i.previous::float8 AS ihsg_previous
            FROM market_flow_daily f
            LEFT JOIN index_summaries i ON i.date = f.date
            WHERE f.scope = ${query.scope}
            ORDER BY f.date DESC
            LIMIT ${query.days}
          ) recent ORDER BY date ASC`;

    return rows.map(toPoint);
  }
}

interface RawPoint {
  date: string;
  net_value: number;
  buy_value: number;
  sell_value: number;
  total_value: number;
  ihsg_close: number | null;
  ihsg_change: number | null;
  ihsg_previous: number | null;
}

function toPoint(row: RawPoint): ForeignFlowPointDto {
  const changePercent =
    row.ihsg_change !== null && row.ihsg_previous !== null && row.ihsg_previous !== 0
      ? (row.ihsg_change / row.ihsg_previous) * 100
      : null;

  return {
    date: row.date,
    netValue: row.net_value,
    buyValue: row.buy_value,
    sellValue: row.sell_value,
    totalValue: row.total_value,
    ihsgClose: row.ihsg_close,
    ihsgChangePercent: changePercent === null ? null : Math.round(changePercent * 100) / 100,
  };
}

export const marketOverviewRepository: MarketOverviewRepository =
  new SqlMarketOverviewRepository();
