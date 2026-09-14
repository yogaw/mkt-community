import type { ForeignFlowDto } from "@/features/market-overview/market-overview-types";

/**
 * The identities the ingestion enforces in SQL, expressed once for the UI and
 * for tests. Keeping them here means a chart or card can assert the numbers it
 * was handed rather than assuming the pipeline was right.
 */
export function isFlowConsistent(flow: ForeignFlowDto): boolean {
  return (
    flow.netValue === flow.buyValue - flow.sellValue &&
    flow.netVolume === flow.buyVolume - flow.sellVolume
  );
}

/** Net flow as a share of the scope's turnover, for context beside the figure. */
export function netShareOfTurnover(flow: ForeignFlowDto): number | null {
  if (flow.totalValue <= 0) {
    return null;
  }
  return Math.round((flow.netValue / flow.totalValue) * 10000) / 100;
}

/** Direction drives colour, so it is named rather than inferred at each call. */
export function flowDirection(netValue: number): "inflow" | "outflow" | "flat" {
  if (netValue > 0) {
    return "inflow";
  }
  return netValue < 0 ? "outflow" : "flat";
}
