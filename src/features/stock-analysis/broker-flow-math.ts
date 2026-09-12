import {
  FLOW_STATE_LABEL,
  type BrokerConcentration,
  type BrokerDailyFlow,
  type BrokerFlow,
  type FlowState,
} from "@/features/stock-analysis/stock-analysis-types";
import { formatRupiahSigned } from "@/features/market-overview/market-format";

/**
 * Every broker-flow calculation, in one place and free of I/O.
 *
 * The repository aggregates; this interprets. Keeping it separate is what lets
 * the arithmetic be tested against worked examples rather than against a
 * database, and it is why no component computes a cumulative total of its own.
 */

/**
 * Where "balanced" ends and a lean begins, as a share of the period's own
 * turnover rather than a rupiah figure.
 *
 * A fixed threshold would call a 50 billion imbalance decisive on a small
 * listing and invisible on BBCA. Two percent of everything traded is a lean
 * either way; five percent is a clear one.
 */
export const FLOW_THRESHOLDS = {
  lean: 0.02,
  strong: 0.05,
} as const;

/** buy - sell, per day, accumulated forward. Days must be ascending. */
export function withCumulative(
  daily: Array<Omit<BrokerDailyFlow, "cumulativeNetValue" | "cumulativeNetLots">>,
): BrokerDailyFlow[] {
  let value = 0;
  let lots = 0;

  return daily.map((day) => {
    value += day.netValue;
    lots += day.netLots;
    return { ...day, cumulativeNetValue: value, cumulativeNetLots: lots };
  });
}

export function netFlowRatio(netValue: number, totalTradedValue: number): number {
  if (totalTradedValue <= 0) {
    return 0;
  }
  return Math.abs(netValue) / totalTradedValue;
}

export function flowStateOf(netValue: number, totalTradedValue: number): FlowState {
  if (netFlowRatio(netValue, totalTradedValue) < FLOW_THRESHOLDS.lean) {
    return "BALANCED";
  }
  return netValue > 0 ? "ACCUMULATION" : "DISTRIBUTION";
}

/** "Moderate Accumulation" / "Strong Distribution" / "Balanced Flow". */
export function flowBiasLabel(netValue: number, totalTradedValue: number): string {
  const state = flowStateOf(netValue, totalTradedValue);
  if (state === "BALANCED") {
    return FLOW_STATE_LABEL.BALANCED;
  }
  const strength =
    netFlowRatio(netValue, totalTradedValue) >= FLOW_THRESHOLDS.strong ? "Strong" : "Moderate";
  return `${strength} ${state === "ACCUMULATION" ? "Accumulation" : "Distribution"}`;
}

/**
 * How much of the period's absolute net flow the biggest brokers account for.
 *
 * Absolute, so a large buyer and a large seller both count as concentration —
 * the question is whether the flow came from a few desks or many, not which
 * way it went.
 */
export function concentrationOf(brokers: Array<{ netValue: number }>): BrokerConcentration {
  const magnitudes = brokers
    .map((broker) => Math.abs(broker.netValue))
    .sort((a, b) => b - a);
  const total = magnitudes.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return { top1Percent: 0, top3Percent: 0, top5Percent: 0 };
  }

  const shareOf = (count: number) =>
    round2((magnitudes.slice(0, count).reduce((sum, value) => sum + value, 0) / total) * 100);

  return { top1Percent: shareOf(1), top3Percent: shareOf(3), top5Percent: shareOf(5) };
}

/** Volume-weighted average, from value and lots. Null when that side never traded. */
export function averagePrice(value: number, lots: number): number | null {
  const shares = lots * 100;
  if (shares <= 0) {
    return null;
  }
  return round2(value / shares);
}

export function sharePercent(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }
  return round2((part / whole) * 100);
}

/**
 * One deterministic sentence describing the period.
 *
 * Built from the numbers, never generated: the same inputs always produce the
 * same sentence, and it claims nothing the aggregate does not show. Broker
 * codes are named as brokers, not as investors.
 */
export function buildInsight({
  netValue,
  totalTradedValue,
  topBuyer,
  topSeller,
  concentration,
}: {
  netValue: number;
  totalTradedValue: number;
  topBuyer: BrokerFlow | null;
  topSeller: BrokerFlow | null;
  concentration: BrokerConcentration;
}): string {
  if (totalTradedValue <= 0) {
    return "No broker transactions were recorded for this stock during the selected period.";
  }

  const state = flowStateOf(netValue, totalTradedValue);
  const headline =
    state === "BALANCED"
      ? `Broker flow was close to balanced, at ${formatRupiahSigned(netValue)} over the selected period.`
      : `Net ${state === "ACCUMULATION" ? "accumulation" : "distribution"} of ${formatRupiahSigned(netValue)} over the selected period.`;

  const actors: string[] = [];
  if (topBuyer && topBuyer.netValue > 0) {
    actors.push(`${topBuyer.brokerCode} was the strongest net buyer`);
  }
  if (topSeller && topSeller.netValue < 0) {
    actors.push(`${topSeller.brokerCode} was the largest net seller`);
  }

  const spread =
    concentration.top3Percent >= 60
      ? "Flow was concentrated in a small number of brokers."
      : concentration.top3Percent >= 40
        ? "Flow was moderately concentrated across brokers."
        : "Flow was relatively dispersed across brokers.";

  return [headline, actors.length > 0 ? `${actors.join(", while ")}.` : null, spread]
    .filter(Boolean)
    .join(" ");
}

export type PriceFlowState =
  | "PRICE_UP_FLOW_UP"
  | "PRICE_UP_FLOW_DOWN"
  | "PRICE_DOWN_FLOW_UP"
  | "PRICE_DOWN_FLOW_DOWN"
  | "UNAVAILABLE";

export const PRICE_FLOW_LABEL: Record<PriceFlowState, { title: string; reading: string }> = {
  PRICE_UP_FLOW_UP: {
    title: "Price up, broker flow positive",
    reading: "Accumulation-compatible",
  },
  PRICE_UP_FLOW_DOWN: {
    title: "Price up, broker flow negative",
    reading: "Potential distribution into strength",
  },
  PRICE_DOWN_FLOW_UP: {
    title: "Price down, broker flow positive",
    reading: "Potential absorption",
  },
  PRICE_DOWN_FLOW_DOWN: {
    title: "Price down, broker flow negative",
    reading: "Selling pressure",
  },
  UNAVAILABLE: {
    title: "Price history unavailable",
    reading: "No close prices cover this period",
  },
};

/**
 * The quadrant the period sits in. A description of two measurements moving
 * together, not a claim that one caused the other.
 */
export function priceFlowState(
  firstClose: number | null,
  lastClose: number | null,
  netValue: number,
): PriceFlowState {
  if (firstClose === null || lastClose === null || firstClose <= 0) {
    return "UNAVAILABLE";
  }
  const priceUp = lastClose >= firstClose;
  const flowUp = netValue >= 0;

  if (priceUp) {
    return flowUp ? "PRICE_UP_FLOW_UP" : "PRICE_UP_FLOW_DOWN";
  }
  return flowUp ? "PRICE_DOWN_FLOW_UP" : "PRICE_DOWN_FLOW_DOWN";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
