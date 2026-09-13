import { cn } from "@/lib/cn";
import {
  directionMark,
  formatPercentPlain,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import { flowBiasLabel } from "@/features/stock-analysis/broker-flow-math";
import type { StockBrokerSummary } from "@/features/stock-analysis/stock-analysis-types";
import { InfoTooltip, TERMS } from "./info-tooltip";

/**
 * Dominant broker, concentration, bias, and one deterministic sentence.
 *
 * Every word of the sentence is computed from the aggregate — no model is
 * involved — and it speaks about brokers rather than about investors.
 */
export function FlowInsightCard({ summary }: { summary: StockBrokerSummary }) {
  const buyer = summary.dominantBuyer;
  const seller = summary.dominantSeller;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-edge bg-panel p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Dominant Broker
        </p>
        {buyer ? (
          <>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-xl font-semibold text-ink">{buyer.brokerCode}</span>
              <span className="text-xs font-semibold text-accent">▲ Net Buy</span>
            </p>
            <p className={cn("mt-1 text-sm font-semibold", toneFor(buyer.netValue))}>
              {formatValueSigned(buyer.netValue)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">No net buyer in this period.</p>
        )}
        {seller ? (
          <p className="mt-3 border-t border-edge pt-2 text-xs text-ink-faint">
            Largest net seller{" "}
            <span className="font-mono font-semibold text-ink-muted">{seller.brokerCode}</span>{" "}
            <span className="font-semibold text-down">{formatValueSigned(seller.netValue)}</span>
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4">
        <p className="flex items-center text-xs font-medium uppercase tracking-wide text-ink-faint">
          Concentration
          <InfoTooltip label="Broker concentration">{TERMS.concentration}</InfoTooltip>
        </p>
        <dl className="mt-2 space-y-1.5">
          <Row label="Top 1" value={formatPercentPlain(summary.concentration.top1Percent)} />
          <Row label="Top 3" value={formatPercentPlain(summary.concentration.top3Percent)} />
          <Row label="Top 5" value={formatPercentPlain(summary.concentration.top5Percent)} />
        </dl>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Flow Bias</p>
        {/* The mark follows the interpreted state, not the raw sign: a net of
            -Rp 1.19M on Rp 2.51T of turnover is balanced, and a red ▼ beside
            the words "Balanced Flow" contradicts the card's own reading. */}
        <p className={cn("mt-2 text-lg font-semibold", biasTone(summary))}>
          {biasMark(summary)} {flowBiasLabel(summary.netValue, summary.totalTradedValue)}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          Based on cumulative net broker value during the selected period.
        </p>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4 lg:col-span-3">
        <p className="flex items-center text-sm font-semibold text-ink">
          Broker Flow Insight
          <InfoTooltip label="Broker flow">{TERMS.brokerProxy}</InfoTooltip>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{summary.insight}</p>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
          <span>
            Buy/sell ratio{" "}
            <span className="font-semibold text-ink-muted">
              {summary.buySellRatio === null ? "—" : `${summary.buySellRatio.toFixed(2)}x`}
            </span>
          </span>
          <span>
            {summary.recordCount.toLocaleString("en-US")} broker-day records over{" "}
            {summary.tradingDays} sessions
          </span>
          <span>{summary.brokers.length} brokers traded</span>
        </p>

        <p className="mt-2 text-xs text-ink-faint">
          Generated from the period&rsquo;s aggregates. Broker codes describe where trades were
          executed, not who placed them.
        </p>
      </div>
    </div>
  );
}

function biasMark(summary: StockBrokerSummary): string {
  if (summary.flowState === "BALANCED") {
    return "—";
  }
  return directionMark(summary.netValue);
}

function biasTone(summary: StockBrokerSummary): string {
  if (summary.flowState === "BALANCED") {
    return "text-ink";
  }
  return toneFor(summary.netValue);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
