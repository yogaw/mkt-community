import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type {
  ForeignFlowDto,
  ForeignFlowPointDto,
  ForeignFlowQuery,
  MarketActivityDto,
  MarketScope,
  MarketSummaryDto,
} from "@/features/market-overview/market-overview-types";
import type {
  FlowRow,
  IndexSummaryRow,
  MarketOverviewRepository,
} from "@/features/market-overview/repository/market-overview-repository";
import { marketOverviewRepository } from "@/features/market-overview/repository/market-overview-repository";

export interface MarketOverviewService {
  getSummary(date?: string): Promise<MarketSummaryDto | null>;
  getForeignFlowSeries(query: ForeignFlowQuery): Promise<ForeignFlowPointDto[]>;
}

export class MarketOverviewServiceImpl implements MarketOverviewService {
  constructor(private readonly repository: MarketOverviewRepository) {}

  /**
   * Defaults to the latest date we hold, not today. On a Saturday — or before
   * the evening's ingestion has run — that is the last session that actually
   * traded, which is what the card should be showing.
   */
  async getSummary(date?: string): Promise<MarketSummaryDto | null> {
    const latestDate = await this.repository.findLatestDate();
    if (latestDate === null) {
      return null;
    }

    const target = date ?? latestDate;
    const index = await this.repository.findIndexSummary(target);
    if (index === null) {
      // A real date the market was shut, or one not ingested yet.
      throw new AppError(404, ErrorCode.notFound);
    }

    const [flows, adjacent] = await Promise.all([
      this.repository.findFlows(target),
      this.repository.findAdjacentDates(target),
    ]);

    const byScope = new Map<MarketScope, FlowRow>(flows.map((flow) => [flow.scope, flow]));

    return {
      date: index.date,
      ihsg: toIhsg(index),
      activity: {
        // All-market activity comes from IDX's own index record, which is the
        // published figure. Regular comes from the broker-derived flows, since
        // IDX does not publish a Regular-only index summary.
        all: {
          volume: index.volume,
          value: index.value,
          frequency: index.frequency,
        },
        regular: toActivity(byScope.get("REGULAR")),
      },
      foreign: {
        all: toForeignFlow(byScope.get("ALL")),
        regular: toForeignFlow(byScope.get("REGULAR")),
      },
      previousDate: adjacent.previous,
      nextDate: adjacent.next,
      latestDate,
    };
  }

  async getForeignFlowSeries(query: ForeignFlowQuery): Promise<ForeignFlowPointDto[]> {
    return this.repository.findFlowSeries(query);
  }
}

function toIhsg(row: IndexSummaryRow) {
  // IDX ships Change, but the percentage is ours to derive — and only where
  // there is a previous close to divide by.
  const changePercent =
    row.change !== null && row.previous !== null && row.previous !== 0
      ? Math.round((row.change / row.previous) * 10000) / 100
      : null;

  return {
    close: row.close,
    previous: row.previous,
    high: row.high,
    low: row.low,
    change: row.change,
    changePercent,
    marketCapital: row.market_capital,
    numberOfStock: row.number_of_stock,
  };
}

/**
 * Regular-scope frequency is deliberately null. broker_summaries.frequency is
 * present but unpopulated (every row is 0), and stock_summaries counts trades
 * across all boards rather than Regular alone, so there is no honest Regular
 * figure to show. Reporting the all-market count in its place would be wrong.
 */
function toActivity(flow: FlowRow | undefined): MarketActivityDto {
  if (!flow) {
    return { volume: null, value: null, frequency: null };
  }
  return { volume: flow.total_volume, value: flow.total_value, frequency: null };
}

function toForeignFlow(flow: FlowRow | undefined): ForeignFlowDto | null {
  if (!flow) {
    return null;
  }
  return {
    buyValue: flow.foreign_buy_value,
    sellValue: flow.foreign_sell_value,
    netValue: flow.foreign_net_value,
    buyVolume: flow.foreign_buy_volume,
    sellVolume: flow.foreign_sell_volume,
    netVolume: flow.foreign_net_volume,
    totalValue: flow.total_value,
  };
}

export const marketOverviewService: MarketOverviewService = new MarketOverviewServiceImpl(
  marketOverviewRepository,
);
