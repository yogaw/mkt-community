"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatTradingDate } from "@/features/market-overview/market-format";
import type { IndicatorUnit } from "@/features/market-data/indicator-catalogue";
import { formatIndicatorValue } from "@/features/market-data/market-data-format";

/*
 * Daily closes as an area, with the previous close drawn as a reference line so
 * "above or below yesterday" is readable without doing arithmetic.
 *
 * The ranges stop at one month because the series is daily. An intraday view
 * would need a separate, much heavier ingestion; offering a 1D button backed by
 * daily bars would draw a single point and call it a day.
 */
const WIDTH = 900;
const HEIGHT = 260;
const PADDING = { top: 16, right: 56, bottom: 24, left: 8 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export interface ChartPoint {
  date: string;
  close: number;
}

interface IndicatorChartProps {
  points: ChartPoint[];
  previousClose: number | null;
  unit: IndicatorUnit;
  decimals: number;
  rising: boolean;
}

export function IndicatorChart({
  points,
  previousClose,
  unit,
  decimals,
  rising,
}: IndicatorChartProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="py-16 text-center text-sm text-ink-faint">
        Not enough history in this range yet.
      </p>
    );
  }

  const closes = points.map((point) => point.close);
  // The reference line must be inside the scale or it cannot be drawn.
  const candidates = previousClose === null ? closes : [...closes, previousClose];
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.01 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const x = (index: number) => PADDING.left + (index / (points.length - 1)) * PLOT_W;
  const y = (value: number) => PADDING.top + PLOT_H - ((value - lo) / (hi - lo)) * PLOT_H;

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.close).toFixed(2)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(2)},${PADDING.top + PLOT_H} L${PADDING.left},${PADDING.top + PLOT_H} Z`;

  const active = activeIndex === null ? null : points[activeIndex];
  const last = points[points.length - 1];

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="img"
        aria-label={`Closing price over ${points.length} sessions`}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className={rising ? "text-accent" : "text-down"} stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" className={rising ? "text-accent" : "text-down"} stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {previousClose !== null ? (
          <>
            <line
              x1={PADDING.left}
              x2={PADDING.left + PLOT_W}
              y1={y(previousClose)}
              y2={y(previousClose)}
              className="stroke-ink-faint/50"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text x={PADDING.left + PLOT_W + 6} y={y(previousClose) + 4} className="fill-ink-faint text-[11px]">
              {formatIndicatorValue(previousClose, unit, decimals)}
            </text>
          </>
        ) : null}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" className={rising ? "stroke-accent" : "stroke-down"} />

        <text
          x={PADDING.left + PLOT_W + 6}
          y={y(last.close) + 4}
          className={cn("text-[11px] font-semibold", rising ? "fill-accent" : "fill-down")}
        >
          {formatIndicatorValue(last.close, unit, decimals)}
        </text>

        {points.map((point, index) => (
          <rect
            key={point.date}
            x={PADDING.left + (index / points.length) * PLOT_W}
            y={PADDING.top}
            width={PLOT_W / points.length}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}

        {active ? (
          <>
            <line x1={x(activeIndex!)} x2={x(activeIndex!)} y1={PADDING.top} y2={PADDING.top + PLOT_H} className="stroke-ink-faint/50" strokeWidth={1} />
            <circle cx={x(activeIndex!)} cy={y(active.close)} r={3.5} className={rising ? "fill-accent" : "fill-down"} />
          </>
        ) : null}

        <text x={PADDING.left} y={HEIGHT - 6} className="fill-ink-faint text-[10px]">
          {formatTradingDate(points[0].date)}
        </text>
        <text x={PADDING.left + PLOT_W} y={HEIGHT - 6} textAnchor="end" className="fill-ink-faint text-[10px]">
          {formatTradingDate(last.date)}
        </text>
      </svg>

      <p aria-live="polite" className="text-center text-xs text-ink-faint">
        {active
          ? `${formatTradingDate(active.date)} · ${formatIndicatorValue(active.close, unit, decimals)}`
          : "Point at the chart for a session's close."}
      </p>
    </div>
  );
}
