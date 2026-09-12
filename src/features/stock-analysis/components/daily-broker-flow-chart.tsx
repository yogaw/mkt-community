"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatDayMonth,
  formatLotsSigned,
  formatRupiah,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { MarketDayFlow } from "@/features/stock-analysis/stock-analysis-types";
import { EmptyPanel } from "./states";

const WIDTH = 960;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 74 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/**
 * Combined daily net broker flow.
 *
 * DAILY, deliberately not cumulative — it is the counterpart to the chart
 * above, and running these totals forward would make two charts that say the
 * same thing.
 */
export function DailyBrokerFlowChart({ daily }: { daily: MarketDayFlow[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (daily.length === 0) {
    return (
      <EmptyPanel
        title="No daily flow for this period."
        description="No broker transactions were recorded in the selected range."
      />
    );
  }

  const values = daily.map((day) => day.netValue);
  const extent = Math.max(1, ...values.map(Math.abs));
  const zeroY = PAD.top + PLOT_H / 2;
  const scale = PLOT_H / 2 / extent;
  const barWidth = Math.max(1.5, (PLOT_W / daily.length) * 0.62);

  const active = hoverIndex === null ? null : daily[hoverIndex];

  return (
    <section className="rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Market Flow by Day</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Combined daily net broker flow.</p>
      </header>

      <div className="px-2 py-3 sm:px-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          role="img"
          aria-label={`Daily net broker flow across ${daily.length} sessions`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[extent, 0, -extent].map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={zeroY - value * scale}
                y2={zeroY - value * scale}
                strokeWidth={1}
                className={value === 0 ? "stroke-ink-faint/50" : "stroke-edge/70"}
              />
              <text
                x={PAD.left - 8}
                y={zeroY - value * scale + 4}
                textAnchor="end"
                className="fill-ink-faint text-[11px]"
              >
                {formatRupiah(value, 1)}
              </text>
            </g>
          ))}

          {daily.map((day, index) => {
            const height = Math.abs(day.netValue) * scale;
            const centre = PAD.left + ((index + 0.5) / daily.length) * PLOT_W;
            return (
              <g key={day.date}>
                <rect
                  x={centre - barWidth / 2}
                  y={day.netValue >= 0 ? zeroY - height : zeroY}
                  width={barWidth}
                  height={Math.max(1, height)}
                  className={day.netValue >= 0 ? "fill-accent" : "fill-down"}
                  opacity={hoverIndex === null || hoverIndex === index ? 1 : 0.45}
                />
                <rect
                  x={PAD.left + (index / daily.length) * PLOT_W}
                  y={PAD.top}
                  width={PLOT_W / daily.length}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              </g>
            );
          })}

          <text x={PAD.left} y={HEIGHT - 6} className="fill-ink-faint text-[10px]">
            {formatDayMonth(daily[0].date)}
          </text>
          <text x={PAD.left + PLOT_W} y={HEIGHT - 6} textAnchor="end" className="fill-ink-faint text-[10px]">
            {formatDayMonth(daily.at(-1)!.date)}
          </text>
        </svg>
      </div>

      <div className="border-t border-edge px-5 py-3 text-xs" aria-live="polite">
        {active ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="font-semibold text-ink">{formatDayMonth(active.date)}</span>
            <span className="text-ink-muted">Buy {formatRupiah(active.buyValue)}</span>
            <span className="text-ink-muted">Sell {formatRupiah(active.sellValue)}</span>
            <span className={cn("font-semibold", toneFor(active.netValue))}>
              Net {formatValueSigned(active.netValue)}
            </span>
            <span className={cn(toneFor(active.netLots))}>
              {formatLotsSigned(active.netLots)} lots
            </span>
          </div>
        ) : (
          <span className="text-ink-faint">Point at a bar for that session&rsquo;s figures.</span>
        )}
      </div>
    </section>
  );
}
