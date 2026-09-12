"use client";

import { cn } from "@/lib/cn";
import { priceFlowState, PRICE_FLOW_LABEL } from "@/features/stock-analysis/broker-flow-math";
import {
  formatDayMonth,
  formatPercentSigned,
  formatPrice,
  formatRupiah,
} from "@/features/stock-analysis/stock-analysis-format";
import type { MarketDayFlow } from "@/features/stock-analysis/stock-analysis-types";
import { InfoTooltip, TERMS } from "./info-tooltip";

const WIDTH = 960;
const HEIGHT = 260;
const PAD = { top: 14, right: 62, bottom: 26, left: 62 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/**
 * Close against daily net broker flow, on one time axis.
 *
 * Two measurements drawn together so a reader can look for themselves. The card
 * beside it names the quadrant the period sits in and says, in as many words,
 * that it is not a signal — because "price rose while brokers bought" is an
 * observation, and anything more would be a claim the data cannot support.
 */
export function PriceVsFlow({ daily, netValue }: { daily: MarketDayFlow[]; netValue: number }) {
  const withClose = daily.filter((day) => day.close !== null);
  const firstClose = withClose[0]?.close ?? null;
  const lastClose = withClose.at(-1)?.close ?? null;
  const state = priceFlowState(firstClose, lastClose, netValue);
  const label = PRICE_FLOW_LABEL[state];

  const priceChange =
    firstClose !== null && lastClose !== null && firstClose !== 0
      ? Math.round(((lastClose - firstClose) / firstClose) * 10000) / 100
      : null;

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <section className="min-w-0 rounded-xl border border-edge bg-panel">
        <header className="border-b border-edge px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Price vs Broker Flow</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Daily close against daily net broker flow.
          </p>
        </header>

        {withClose.length < 2 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            No closing prices cover this period, so the comparison is not available. The broker
            analysis above is unaffected.
          </p>
        ) : (
          <Chart daily={daily} />
        )}
      </section>

      <section className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="flex items-center text-sm font-semibold text-ink">
          Price / Broker Flow
          <InfoTooltip label="Flow interpretation">{TERMS.flowInterpretation}</InfoTooltip>
        </h3>

        <p className="mt-3 text-sm font-semibold text-ink">{label.title}</p>
        <p
          className={cn(
            "mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
            state === "UNAVAILABLE"
              ? "bg-panel-raised text-ink-faint"
              : state === "PRICE_UP_FLOW_UP"
                ? "bg-accent/10 text-accent"
                : state === "PRICE_DOWN_FLOW_DOWN"
                  ? "bg-down/10 text-down"
                  : "bg-warn/10 text-warn",
          )}
        >
          {label.reading}
        </p>

        {firstClose !== null && lastClose !== null ? (
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Period open" value={formatPrice(firstClose)} />
            <Row label="Period close" value={formatPrice(lastClose)} />
            <Row label="Price change" value={formatPercentSigned(priceChange)} />
          </dl>
        ) : null}

        <p className="mt-4 border-t border-edge pt-3 text-xs text-ink-faint">
          Flow interpretation — not a trading signal. Two measurements moving together is not
          evidence that one caused the other.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-semibold whitespace-nowrap text-ink">{value}</dd>
    </div>
  );
}

function Chart({ daily }: { daily: MarketDayFlow[] }) {
  const closes = daily.map((day) => day.close).filter((close): close is number => close !== null);
  const priceMin = Math.min(...closes);
  const priceMax = Math.max(...closes);
  const priceSpan = priceMax - priceMin || 1;

  const flowExtent = Math.max(1, ...daily.map((day) => Math.abs(day.netValue)));
  const zeroY = PAD.top + PLOT_H * 0.72;
  const flowScale = (PLOT_H * 0.26) / flowExtent;

  const x = (index: number) =>
    PAD.left + (daily.length === 1 ? PLOT_W / 2 : (index / (daily.length - 1)) * PLOT_W);
  const priceY = (close: number) =>
    PAD.top + PLOT_H * 0.6 - ((close - priceMin) / priceSpan) * (PLOT_H * 0.55);

  const line = daily
    .map((day, index) =>
      day.close === null ? null : `${x(index).toFixed(1)},${priceY(day.close).toFixed(1)}`,
    )
    .filter((point): point is string => point !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point}`)
    .join(" ");

  const barWidth = Math.max(1.5, (PLOT_W / daily.length) * 0.55);

  return (
    <div className="px-2 py-3 sm:px-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="img"
        aria-label="Daily close and daily net broker flow"
      >
        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={zeroY}
          y2={zeroY}
          strokeWidth={1}
          className="stroke-ink-faint/50"
        />

        {daily.map((day, index) => {
          const height = Math.abs(day.netValue) * flowScale;
          return (
            <rect
              key={day.date}
              x={x(index) - barWidth / 2}
              y={day.netValue >= 0 ? zeroY - height : zeroY}
              width={barWidth}
              height={Math.max(1, height)}
              className={day.netValue >= 0 ? "fill-accent/60" : "fill-down/60"}
            />
          );
        })}

        <path d={line} fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" className="stroke-ink" />

        <text x={PAD.left - 8} y={priceY(priceMax) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">
          {formatPrice(priceMax)}
        </text>
        <text x={PAD.left - 8} y={priceY(priceMin) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">
          {formatPrice(priceMin)}
        </text>
        <text x={PAD.left + PLOT_W + 6} y={zeroY - flowExtent * flowScale + 4} className="fill-ink-faint text-[11px]">
          {formatRupiah(flowExtent, 1)}
        </text>
        <text x={PAD.left + PLOT_W + 6} y={zeroY + 4} className="fill-ink-faint text-[11px]">
          0
        </text>

        <text x={PAD.left} y={HEIGHT - 6} className="fill-ink-faint text-[10px]">
          {formatDayMonth(daily[0].date)}
        </text>
        <text x={PAD.left + PLOT_W} y={HEIGHT - 6} textAnchor="end" className="fill-ink-faint text-[10px]">
          {formatDayMonth(daily.at(-1)!.date)}
        </text>
      </svg>

      <p className="mt-1 text-center text-xs text-ink-faint">
        <span className="font-semibold text-ink">Line</span> close ·{" "}
        <span className="font-semibold text-accent">Green</span> net buying ·{" "}
        <span className="font-semibold text-down">Red</span> net selling
      </p>
    </div>
  );
}
