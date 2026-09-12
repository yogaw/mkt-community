"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatTradingDate } from "@/features/market-overview/market-format";
import type { HistoryPoint, Instrument } from "@/features/market-data/market-data-model";
import { formatValue } from "@/features/market-data/instrument-format";

/*
 * One chart for every instrument in the module.
 *
 * The y-axis is padded from the series' own range rather than zero-based: for a
 * yield moving between 4.90 and 5.00 a zero baseline would flatten the line to
 * nothing. The padding is proportional, so a quiet day stays visibly quiet
 * instead of being stretched into drama.
 *
 * The line does not turn green because the series rose. Direction is carried by
 * the change figures above; the chart uses the product's own accent so twenty
 * instruments do not render as twenty different colours.
 */
const WIDTH = 920;
const HEIGHT = 280;
const PADDING = { top: 16, right: 64, bottom: 26, left: 10 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export function MarketChart({
  instrument,
  points,
}: {
  instrument: Instrument;
  points: HistoryPoint[];
}) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-edge">
        <p className="text-sm text-ink-faint">No history for this timeframe yet.</p>
      </div>
    );
  }

  const closes = points.map((point) => point.close);
  const reference = instrument.previousClose;
  const candidates = reference === null ? closes : [...closes, reference];
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  // Proportional headroom; the fallbacks keep a perfectly flat series drawable.
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.005 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const x = (index: number) => PADDING.left + (index / (points.length - 1)) * PLOT_W;
  const y = (value: number) => PADDING.top + PLOT_H - ((value - lo) / (hi - lo)) * PLOT_H;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.close).toFixed(2)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(2)},${PADDING.top + PLOT_H} L${PADDING.left},${PADDING.top + PLOT_H} Z`;

  const active = activeIndex === null ? null : points[activeIndex];
  const last = points[points.length - 1];

  /* When the last close sits on the previous close the two right-hand labels
     land on the same line and overprint each other. The dashed line still
     shows where the reference is; only its label steps aside. */
  const showReferenceLabel =
    reference !== null && Math.abs(y(reference) - y(last.close)) > 12;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="img"
        aria-label={`${instrument.name} closing price across ${points.length} sessions`}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" className="text-accent" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-accent" />
          </linearGradient>
        </defs>

        {[hi - pad, (hi + lo) / 2, lo + pad].map((value) => (
          <line
            key={value}
            x1={PADDING.left}
            x2={PADDING.left + PLOT_W}
            y1={y(value)}
            y2={y(value)}
            className="stroke-edge/60"
            strokeWidth={1}
          />
        ))}

        {reference !== null ? (
          <>
            <line
              x1={PADDING.left}
              x2={PADDING.left + PLOT_W}
              y1={y(reference)}
              y2={y(reference)}
              className="stroke-ink-faint/60"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {showReferenceLabel ? (
              <text x={PADDING.left + PLOT_W + 6} y={y(reference) + 4} className="fill-ink-faint text-[11px]">
                {formatValue(instrument, reference)}
              </text>
            ) : null}
          </>
        ) : null}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" className="stroke-accent" />

        <text x={PADDING.left + PLOT_W + 6} y={y(last.close) + 4} className="fill-accent text-[11px] font-semibold">
          {formatValue(instrument, last.close)}
        </text>

        {points.map((point, index) => (
          <rect
            key={point.date}
            x={PADDING.left + (index / points.length) * PLOT_W}
            y={PADDING.top}
            width={Math.max(1, PLOT_W / points.length)}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}

        {active ? (
          <>
            <line x1={x(activeIndex!)} x2={x(activeIndex!)} y1={PADDING.top} y2={PADDING.top + PLOT_H} className="stroke-ink-faint/50" strokeWidth={1} />
            <circle cx={x(activeIndex!)} cy={y(active.close)} r={3.5} className="fill-accent" />
          </>
        ) : null}

        <text x={PADDING.left} y={HEIGHT - 8} className="fill-ink-faint text-[10px]">
          {formatTradingDate(points[0].date)}
        </text>
        <text x={PADDING.left + PLOT_W} y={HEIGHT - 8} textAnchor="end" className="fill-ink-faint text-[10px]">
          {formatTradingDate(last.date)}
        </text>
      </svg>

      <p aria-live="polite" className={cn("text-center text-xs", active ? "text-ink-muted" : "text-ink-faint")}>
        {active
          ? `${formatTradingDate(active.date)} · ${formatValue(instrument, active.close)}`
          : "Point at the chart for a session's close."}
      </p>
    </div>
  );
}
