import { cn } from "@/lib/cn";
import {
  directionMark,
  formatLotsPlain,
  formatLotsSigned,
  formatRupiah,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import { flowBiasLabel } from "@/features/stock-analysis/broker-flow-math";
import { FLOW_STATE_LABEL, type StockBrokerSummary } from "@/features/stock-analysis/stock-analysis-types";
import { InfoTooltip, TERMS } from "./info-tooltip";

/** Buy, sell, net, and how the period reads. */
export function BrokerSummaryCards({ summary }: { summary: StockBrokerSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Total Buy Value"
        value={formatRupiah(summary.totalBuyValue)}
        secondary={`${formatLotsPlain(summary.totalBuyLots)} lots`}
      />
      <Card
        label="Total Sell Value"
        value={formatRupiah(summary.totalSellValue)}
        secondary={`${formatLotsPlain(summary.totalSellLots)} lots`}
      />
      <Card
        label="Net Broker Flow"
        tooltip={TERMS.netBrokerFlow}
        value={`${directionMark(summary.netValue)} ${formatValueSigned(summary.netValue)}`}
        secondary={`${formatLotsSigned(summary.netLots)} lots`}
        tone={toneFor(summary.netValue)}
      />
      <Card
        label="Flow Interpretation"
        tooltip={TERMS.accumulation}
        value={FLOW_STATE_LABEL[summary.flowState]}
        secondary={`${flowBiasLabel(summary.netValue, summary.totalTradedValue)} · ${summary.tradingDays} sessions`}
        tone={
          summary.flowState === "ACCUMULATION"
            ? "text-accent"
            : summary.flowState === "DISTRIBUTION"
              ? "text-down"
              : "text-ink-muted"
        }
      />
    </div>
  );
}

function Card({
  label,
  value,
  secondary,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  secondary: string;
  tone?: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <p className="flex items-center text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
        {tooltip ? <InfoTooltip label={label}>{tooltip}</InfoTooltip> : null}
      </p>
      <p className={cn("mt-2 text-xl font-semibold tracking-tight whitespace-nowrap", tone ?? "text-ink")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-faint">{secondary}</p>
    </div>
  );
}
