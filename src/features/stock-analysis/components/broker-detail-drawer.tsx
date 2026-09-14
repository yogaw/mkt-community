"use client";

import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/cn";
import { brokerColor } from "@/features/stock-analysis/broker-colors";
import {
  directionMark,
  formatDayMonth,
  formatLotsPlain,
  formatLotsSigned,
  formatPrice,
  formatRupiah,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { BrokerFlow } from "@/features/stock-analysis/stock-analysis-types";

/**
 * One broker's period, without leaving the stock.
 *
 * A side sheet rather than a route: the reader is comparing this desk against
 * the others on screen, and navigating away would lose the comparison they came
 * for.
 */
export function BrokerDetailDrawer({
  broker,
  ticker,
  onClose,
}: {
  broker: BrokerFlow | null;
  ticker: string;
  onClose: () => void;
}) {
  if (!broker) {
    return null;
  }

  const traded = broker.daily.filter((day) => day.buyValue > 0 || day.sellValue > 0);
  const topBuy = [...traded].sort((a, b) => b.netValue - a.netValue)[0] ?? null;
  const topSell = [...traded].sort((a, b) => a.netValue - b.netValue)[0] ?? null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${broker.brokerCode} · ${ticker}`}
      description="Broker activity during the selected period."
    >
      <div className="space-y-5 px-5 py-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: brokerColor(broker.brokerCode) }}
          />
          <div>
            <p className="font-mono text-lg font-semibold text-ink">{broker.brokerCode}</p>
            <p className="text-xs text-ink-faint">
              {broker.brokerName ?? "Broker name not published in this dataset"}
            </p>
          </div>
          <span className={cn("ml-auto text-right text-lg font-semibold", toneFor(broker.netValue))}>
            {directionMark(broker.netValue)} {formatValueSigned(broker.netValue)}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Stat label="Total Buy" value={formatRupiah(broker.buyValue)} />
          <Stat label="Total Sell" value={formatRupiah(broker.sellValue)} />
          <Stat label="Buy Lots" value={formatLotsPlain(broker.buyLots)} />
          <Stat label="Sell Lots" value={formatLotsPlain(broker.sellLots)} />
          <Stat label="Net Lots" value={formatLotsSigned(broker.netLots)} tone={toneFor(broker.netLots)} />
          <Stat label="Trading Days" value={String(broker.tradingDays)} />
          <Stat label="Avg Buy Price" value={formatPrice(broker.avgBuyPrice, 2)} />
          <Stat label="Avg Sell Price" value={formatPrice(broker.avgSellPrice, 2)} />
        </dl>

        <section>
          <h3 className="text-sm font-semibold text-ink">Cumulative Net Flow</h3>
          <MiniChart
            values={broker.daily.map((day) => day.cumulativeNetValue)}
            color={brokerColor(broker.brokerCode)}
            mode="line"
          />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">Daily Net Flow</h3>
          <MiniChart values={broker.daily.map((day) => day.netValue)} mode="bars" />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Extreme label="Largest net buy day" day={topBuy} />
          <Extreme label="Largest net sell day" day={topSell} />
        </section>
      </div>
    </Drawer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-semibold whitespace-nowrap", tone ?? "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

function Extreme({
  label,
  day,
}: {
  label: string;
  day: { date: string; netValue: number } | null;
}) {
  return (
    <div className="rounded-lg border border-edge bg-panel-raised/40 p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      {day ? (
        <>
          <p className="mt-1 text-sm font-semibold text-ink">{formatDayMonth(day.date)}</p>
          <p className={cn("text-sm font-semibold", toneFor(day.netValue))}>
            {formatValueSigned(day.netValue)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-ink-faint">No activity</p>
      )}
    </div>
  );
}

const W = 320;
const H = 80;

function MiniChart({
  values,
  color,
  mode,
}: {
  values: number[];
  color?: string;
  mode: "line" | "bars";
}) {
  if (values.length < 2) {
    return <p className="mt-2 text-sm text-ink-faint">Not enough sessions to plot.</p>;
  }

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const y = (value: number) => H - ((value - min) / span) * H;
  const zero = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-20 w-full" aria-hidden="true">
      <line x1={0} x2={W} y1={zero} y2={zero} strokeWidth={1} className="stroke-ink-faint/40" />
      {mode === "line" ? (
        <path
          d={values
            .map((value, index) => `${index === 0 ? "M" : "L"}${(index / (values.length - 1)) * W},${y(value)}`)
            .join(" ")}
          fill="none"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          stroke={color}
        />
      ) : (
        values.map((value, index) => {
          const height = Math.abs(y(value) - zero);
          return (
            <rect
              key={index}
              x={(index / values.length) * W}
              y={value >= 0 ? zero - height : zero}
              width={Math.max(1, (W / values.length) * 0.7)}
              height={Math.max(1, height)}
              className={value >= 0 ? "fill-accent" : "fill-down"}
            />
          );
        })
      )}
    </svg>
  );
}
