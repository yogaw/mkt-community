"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { brokerColor } from "@/features/stock-analysis/broker-colors";
import {
  directionWord,
  formatDayMonth,
  formatLotsSigned,
  formatRupiah,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { BrokerFlow } from "@/features/stock-analysis/stock-analysis-types";
import { EmptyPanel } from "./states";
import { InfoTooltip, TERMS } from "./info-tooltip";

const WIDTH = 960;
const HEIGHT = 340;
const PAD = { top: 16, right: 16, bottom: 30, left: 74 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/**
 * Cumulative net broker flow, one line per broker.
 *
 * CUMULATIVE, not daily: each point is the running total of buy minus sell
 * from the first day of the period, which is what makes a line's slope read as
 * "this desk was accumulating through here" rather than as one noisy session.
 * The running totals arrive from the service already computed — nothing is
 * accumulated here, so the chart and the table can never disagree.
 */
export function BrokerCumulativeChart({
  brokers,
  onSelectBroker,
}: {
  brokers: BrokerFlow[];
  onSelectBroker: (brokerCode: string) => void;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dates = useMemo(() => {
    const all = new Set<string>();
    for (const broker of brokers) {
      for (const day of broker.daily) {
        all.add(day.date);
      }
    }
    return [...all].sort();
  }, [brokers]);

  /* A broker with no row on a date did not trade that day; its cumulative
     total carries forward rather than dropping to zero, which would draw a
     spike that never happened. */
  const series = useMemo(() => {
    const indexByDate = new Map(dates.map((date, index) => [date, index]));

    return brokers.map((broker) => {
      const points: Array<{ value: number; lots: number; buy: number; sell: number } | null> =
        Array.from({ length: dates.length }, () => null);

      for (const day of broker.daily) {
        const index = indexByDate.get(day.date);
        if (index !== undefined) {
          points[index] = {
            value: day.cumulativeNetValue,
            lots: day.cumulativeNetLots,
            buy: day.buyValue,
            sell: day.sellValue,
          };
        }
      }

      let carried = { value: 0, lots: 0, buy: 0, sell: 0 };
      const filled = points.map((point) => {
        if (point) {
          carried = point;
          return point;
        }
        return { ...carried, buy: 0, sell: 0 };
      });

      return { broker, points: filled };
    });
  }, [brokers, dates]);

  if (dates.length === 0) {
    return (
      <EmptyPanel
        title="No broker transaction data for this period."
        description="Try a different date range, or another board."
      />
    );
  }

  const shown = series.filter(({ broker }) => !hidden.has(broker.brokerCode));
  const values = shown.flatMap(({ points }) => points.map((point) => point.value));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const x = (index: number) =>
    PAD.left + (dates.length === 1 ? PLOT_W / 2 : (index / (dates.length - 1)) * PLOT_W);
  const y = (value: number) => PAD.top + PLOT_H - ((value - lo) / (hi - lo)) * PLOT_H;

  /* The midpoint tick is dropped when it would land on top of the zero line,
     which happens whenever the series is lopsided — two labels printed over
     each other is worse than one fewer gridline. */
  const midpoint = (hi + lo) / 2;
  const crossesZero = lo < 0 && hi > 0;
  const ticks = [hi, lo]
    .concat(crossesZero ? [0] : [])
    .concat(!crossesZero || Math.abs(midpoint) > (hi - lo) * 0.12 ? [midpoint] : []);

  return (
    <section className="rounded-xl border border-edge bg-panel">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-5 py-4">
        <div>
          <h2 className="flex items-center text-base font-semibold text-ink">
            Broker Analysis
            <InfoTooltip label="Broker flow">{TERMS.brokerProxy}</InfoTooltip>
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Cumulative net broker flow during the selected period.
          </p>
        </div>
        {hidden.size > 0 ? (
          <button
            type="button"
            onClick={() => setHidden(new Set())}
            className="shrink-0 rounded-lg border border-edge bg-panel-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Reset chart
          </button>
        ) : null}
      </header>

      <div className="px-2 py-3 sm:px-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          role="img"
          aria-label={`Cumulative net broker flow for ${shown.length} brokers across ${dates.length} sessions`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={y(value)}
                y2={y(value)}
                strokeWidth={1}
                className={value === 0 ? "stroke-ink-faint/50" : "stroke-edge/70"}
                strokeDasharray={value === 0 ? "4 4" : undefined}
              />
              <text x={PAD.left - 8} y={y(value) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">
                {formatRupiah(value, 1)}
              </text>
            </g>
          ))}

          {shown.map(({ broker, points }) => (
            <path
              key={broker.brokerCode}
              d={points
                .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
                .join(" ")}
              fill="none"
              strokeWidth={1.8}
              vectorEffect="non-scaling-stroke"
              stroke={brokerColor(broker.brokerCode)}
            />
          ))}

          {hoverIndex !== null ? (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              strokeWidth={1}
              className="stroke-ink-faint/60"
            />
          ) : null}

          {hoverIndex !== null
            ? shown.map(({ broker, points }) => (
                <circle
                  key={broker.brokerCode}
                  cx={x(hoverIndex)}
                  cy={y(points[hoverIndex].value)}
                  r={3}
                  fill={brokerColor(broker.brokerCode)}
                />
              ))
            : null}

          {dates.map((date, index) => (
            <rect
              key={date}
              x={PAD.left + (index / dates.length) * PLOT_W}
              y={PAD.top}
              width={Math.max(1, PLOT_W / dates.length)}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}

          <text x={PAD.left} y={HEIGHT - 8} className="fill-ink-faint text-[10px]">
            {formatDayMonth(dates[0])}
          </text>
          <text x={PAD.left + PLOT_W} y={HEIGHT - 8} textAnchor="end" className="fill-ink-faint text-[10px]">
            {formatDayMonth(dates.at(-1)!)}
          </text>
        </svg>
      </div>

      {hoverIndex !== null ? (
        <div className="border-t border-edge px-5 py-3">
          <p className="text-xs font-semibold text-ink">{formatDayMonth(dates[hoverIndex])}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-xs">
              <thead>
                <tr className="text-ink-faint">
                  <th scope="col" className="pb-1 text-left font-medium">Broker</th>
                  <th scope="col" className="pb-1 text-right font-medium">Buy</th>
                  <th scope="col" className="pb-1 text-right font-medium">Sell</th>
                  <th scope="col" className="pb-1 text-right font-medium">Cumulative Net</th>
                  <th scope="col" className="pb-1 text-right font-medium">Net Lots</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 8).map(({ broker, points }) => {
                  const point = points[hoverIndex];
                  return (
                    <tr key={broker.brokerCode}>
                      <td className="py-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: brokerColor(broker.brokerCode) }}
                          />
                          <span className="font-mono font-semibold text-ink">{broker.brokerCode}</span>
                        </span>
                      </td>
                      <td className="py-0.5 text-right whitespace-nowrap text-ink-muted">{formatRupiah(point.buy)}</td>
                      <td className="py-0.5 text-right whitespace-nowrap text-ink-muted">{formatRupiah(point.sell)}</td>
                      <td className={cn("py-0.5 text-right font-semibold whitespace-nowrap", toneFor(point.value))}>
                        {formatValueSigned(point.value)}
                      </td>
                      <td className={cn("py-0.5 text-right whitespace-nowrap", toneFor(point.lots))}>
                        {formatLotsSigned(point.lots)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="border-t border-edge px-5 py-3 text-xs text-ink-faint">
          Point at the chart for a session&rsquo;s cumulative figures. Select a broker in the
          legend to hide its line.
        </p>
      )}

      <BrokerChartLegend
        brokers={brokers}
        hidden={hidden}
        onToggle={(code) =>
          setHidden((current) => {
            const next = new Set(current);
            if (next.has(code)) {
              next.delete(code);
            } else {
              next.add(code);
            }
            return next;
          })
        }
        onOpen={onSelectBroker}
      />
    </section>
  );
}

export function BrokerChartLegend({
  brokers,
  hidden,
  onToggle,
  onOpen,
}: {
  brokers: BrokerFlow[];
  hidden: Set<string>;
  onToggle: (brokerCode: string) => void;
  onOpen: (brokerCode: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5 border-t border-edge px-5 py-3">
      {brokers.map((broker) => {
        const isHidden = hidden.has(broker.brokerCode);
        return (
          <li key={broker.brokerCode} className="flex items-center">
            <button
              type="button"
              aria-pressed={!isHidden}
              onClick={() => onToggle(broker.brokerCode)}
              title={isHidden ? "Show this broker" : "Hide this broker"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-l-md border border-r-0 border-edge px-2 py-1 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                isHidden ? "opacity-40 hover:opacity-70" : "hover:bg-panel-raised",
              )}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: brokerColor(broker.brokerCode) }}
              />
              <span className="font-mono font-semibold text-ink">{broker.brokerCode}</span>
              <span className={cn("font-medium", toneFor(broker.netValue))}>
                Net {directionWord(broker.netValue)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onOpen(broker.brokerCode)}
              aria-label={`Open ${broker.brokerCode} detail`}
              className="rounded-r-md border border-edge px-1.5 py-1 text-xs text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              &rsaquo;
            </button>
          </li>
        );
      })}
    </ul>
  );
}
