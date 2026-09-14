import type { MarketIndexSnapshotModel } from "@/database/prisma/models";
import type { MarketIndexSnapshotDto } from "@/features/market-index/market-index-types";

/**
 * Decimal columns come back as Prisma Decimal objects, which do not survive
 * JSON serialisation as numbers. Converting here keeps that detail inside the
 * data layer rather than leaking into the API contract.
 */
export function toMarketIndexSnapshotDto(
  snapshot: MarketIndexSnapshotModel,
): MarketIndexSnapshotDto {
  return {
    id: snapshot.id,
    indexName: snapshot.indexName,
    value: Number(snapshot.value),
    changePercent: Number(snapshot.changePercent),
    turnoverIdr: Number(snapshot.turnoverIdr),
    foreignFlowIdr: Number(snapshot.foreignFlowIdr),
    advancers: snapshot.advancers,
    decliners: snapshot.decliners,
    capturedAt: snapshot.capturedAt.toISOString(),
  };
}
