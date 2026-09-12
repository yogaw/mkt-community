"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatIndexLevel,
  formatPercent,
  formatRupiah,
  formatRupiahSigned,
  formatTradingDate,
} from "@/features/market-overview/market-format";
import type { ForeignFlowPointDto } from "@/features/market-overview/market-overview-types";

/*
 * Inline SVG rather than a charting dependency: two series, one screen, and a
 * fixed interaction. Bars are foreign net flow on the left axis, the IHSG close
 * is a line on the right. The two axes are independent by necessity — rupiah
 * and index points share no scale — so the bars carry a zero line and the line
 * does not, which keeps "net flow crossed zero" readable without implying the
 * index did anything at that height.
 */
const WIDTH = 960;
const HEIGHT = 260;
const PADDING = { top: 16, right: 56, bottom: 26, left: 62 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

interface ForeignFlowChartProps {
  points: ForeignFlowPointDto[];
}

function niceBound(value: number): number {
  if (value === 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function ForeignFlowChart({ points }: ForeignFlowChartProps) {
  const clipId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return null;
  }

  // Bars: symmetric around zero so a net-buy day and an equal net-sell day are
  // the same height in opposite directions.
  const maxAbsNet = niceBound(Math.max(...points.map((point) => Math.abs(point.netValue))));
  const netToY = (value: number) =>
    PADDING.top + PLOT_HEIGHT / 2 - (value / maxAbsNet) * (PLOT_HEIGHT / 2);
  const zeroY = netToY(0);

  const closes = points.map((point) => point.ihsgClose).filter((close): close is number => close !== null);
  const hasLine = closes.length > 1;
  const minClose = hasLine ? Math.min(...closes) : 0;
  const maxClose = hasLine ? Math.max(...closes) : 1;
  // A little headroom so the line never rides the frame.
  const closePad = (maxClose - minClose) * 0.15 || 1;
  const closeToY = (close: number) =>
    PADDING.top +
    PLOT_HEIGHT -
    ((close - (minClose - closePad)) / (maxClose + closePad - (minClose - closePad))) * PLOT_HEIGHT;

  const slotWidth = PLOT_WIDTH / points.length;
  const barWidth = Math.max(2, Math.min(18, slotWidth * 0.62));
  const centerX = (index: number) => PADDING.left + slotWidth * (index + 0.5);

  const linePath = points
    .map((point, index) =>
      point.ihsgClose === null ? null : `${centerX(index)},${closeToY(point.ihsgClose)}`,
    )
    // A gap rather than a straight line through a day we have no close for.
    .reduce<string[]>((segments, coordinate) => {
      if (coordinate === null) {
        segments.push("");
      } else {
        const last = segments[segments.length - 1];
        segments[segments.length - 1] = last ? `${last} L${coordinate}` : `M${coordinate}`;
      }
      return segments;
    }, [""])
    .filter(Boolean)
    .join(" ");

  const active = activeIndex === null ? null : points[activeIndex];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          // Width drives, height follows. Fixing the height instead letterboxes
          // the plot inside a wider container and leaves dead strips either
          // side where pointing at a day does nothing.
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label={`Foreign net flow and IHSG close over ${points.length} trading days`}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PADDING.left} y={PADDING.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
            </clipPath>
          </defs>

          {/* Left axis: net flow. Only the bounds and zero are labelled — more
              gridlines would compete with the bars for attention. */}
          {[maxAbsNet, 0, -maxAbsNet].map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + PLOT_WIDTH}
                y1={netToY(value)}
                y2={netToY(value)}
                className={value === 0 ? "stroke-edge" : "stroke-edge/50"}
                strokeWidth={value === 0 ? 1 : 1}
                strokeDasharray={value === 0 ? undefined : "3 4"}
              />
              <text
                x={PADDING.left - 8}
                y={netToY(value) + 4}
                textAnchor="end"
                className="fill-ink-faint text-[10px]"
              >
                {value === 0 ? "0" : formatRupiah(value, 1)}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId})`}>
            {points.map((point, index) => {
              const y = netToY(point.netValue);
              const height = Math.max(1, Math.abs(zeroY - y));
              const isInflow = point.netValue >= 0;
              return (
                <rect
                  key={point.date}
                  x={centerX(index) - barWidth / 2}
                  y={isInflow ? y : zeroY}
                  width={barWidth}
                  height={height}
                  rx={1}
                  className={cn(
                    isInflow ? "fill-accent" : "fill-down",
                    activeIndex !== null && activeIndex !== index ? "opacity-35" : "opacity-90",
                  )}
                />
              );
            })}

            {hasLine ? (
              <path d={linePath} fill="none" strokeWidth={1.8} className="stroke-info" />
            ) : null}
          </g>

          {/* Right axis: IHSG. Labelled at its own extremes so the line's shape
              is readable without pretending it shares the left scale. */}
          {hasLine
            ? [maxClose, minClose].map((close) => (
                <text
                  key={close}
                  x={PADDING.left + PLOT_WIDTH + 8}
                  y={closeToY(close) + 4}
                  className="fill-info text-[10px]"
                >
                  {formatIndexLevel(close)}
                </text>
              ))
            : null}

          {/* First and last date only; a 30-bar axis cannot hold more legibly. */}
          <text x={PADDING.left} y={HEIGHT - 8} className="fill-ink-faint text-[10px]">
            {formatTradingDate(points[0].date)}
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={HEIGHT - 8}
            textAnchor="end"
            className="fill-ink-faint text-[10px]"
          >
            {formatTradingDate(points[points.length - 1].date)}
          </text>

          {/* Full-height hit targets: pointing anywhere in a day's column
              selects it, not just the few pixels the bar happens to occupy. */}
          {points.map((point, index) => (
            <rect
              key={`hit-${point.date}`}
              x={PADDING.left + slotWidth * index}
              y={PADDING.top}
              width={slotWidth}
              height={PLOT_HEIGHT}
              fill="transparent"
              onMouseEnter={() => setActiveIndex(index)}
            />
          ))}

          {active ? (
            <line
              x1={centerX(activeIndex ?? 0)}
              x2={centerX(activeIndex ?? 0)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_HEIGHT}
              className="stroke-ink-faint/50"
              strokeWidth={1}
            />
          ) : null}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" /> Net foreign buy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-down" aria-hidden="true" /> Net foreign sell
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-info" aria-hidden="true" /> IHSG close (right axis)
        </span>
      </div>

      {/* Below the chart rather than floating over it: keeps the bars unobscured
          and gives the same detail to a keyboard or screen-reader user. */}
      <div
        aria-live="polite"
        className="rounded-lg border border-edge bg-panel-raised/40 px-4 py-3 text-sm"
      >
        {active ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-7">
            <Detail label="Date" value={formatTradingDate(active.date)} />
            <Detail
              label="IHSG close"
              value={active.ihsgClose === null ? "—" : formatIndexLevel(active.ihsgClose)}
            />
            <Detail
              label="IHSG change"
              value={active.ihsgChangePercent === null ? "—" : formatPercent(active.ihsgChangePercent)}
              tone={
                active.ihsgChangePercent === null
                  ? undefined
                  : active.ihsgChangePercent >= 0
                    ? "up"
                    : "down"
              }
            />
            <Detail label="Foreign buy" value={formatRupiah(active.buyValue)} />
            <Detail label="Foreign sell" value={formatRupiah(active.sellValue)} />
            <Detail
              label="Net foreign"
              value={formatRupiahSigned(active.netValue)}
              tone={active.netValue >= 0 ? "up" : "down"}
            />
            <Detail label="Market value" value={formatRupiah(active.totalValue)} />
          </div>
        ) : (
          <p className="text-ink-faint">
            Point at a day to see its foreign buy, sell and net against the IHSG close.
          </p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          "font-semibold",
          tone === "up" ? "text-accent" : tone === "down" ? "text-down" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
