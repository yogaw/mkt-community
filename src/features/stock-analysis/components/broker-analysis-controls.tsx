"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  BOARD_LABEL,
  DATE_PRESETS,
  MARKET_BOARDS,
  TOP_BROKER_CHOICES,
  type DatePreset,
  type MarketBoard,
} from "@/features/stock-analysis/stock-analysis-types";
import { formatDayMonth } from "@/features/stock-analysis/stock-analysis-format";
import { StockPicker } from "./stock-picker";

export interface ControlState {
  startDate: string;
  endDate: string;
  topBrokers: number;
  market: MarketBoard;
}

/**
 * The analysis controls.
 *
 * Presets are the common path and apply immediately; the custom dates are the
 * uncommon one and wait for Analyze, because a half-typed date should not fire
 * a query over four million rows.
 */
export function BrokerAnalysisControls({
  ticker,
  draft,
  applied,
  preset,
  coverage,
  isLoading,
  onDraftChange,
  onPreset,
  onAnalyze,
  onTickerChange,
}: {
  ticker: string;
  onTickerChange: (ticker: string) => void;
  draft: ControlState;
  applied: ControlState;
  preset: DatePreset;
  coverage: { earliest: string; latest: string } | null;
  isLoading: boolean;
  onDraftChange: (next: ControlState) => void;
  onPreset: (preset: DatePreset) => void;
  onAnalyze: () => void;
}) {
  const invalid = draft.startDate > draft.endDate;
  const dirty =
    draft.startDate !== applied.startDate ||
    draft.endDate !== applied.endDate ||
    draft.topBrokers !== applied.topBrokers ||
    draft.market !== applied.market;

  return (
    <section className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Stock" className="w-[9rem]">
          <StockPicker ticker={ticker} onSelect={onTickerChange} />
        </Field>

        <Field label="From" className="w-[10rem]">
          <input
            type="date"
            value={draft.startDate}
            min={coverage?.earliest}
            max={coverage?.latest}
            onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })}
            className={cn(inputClass, invalid && "border-down")}
          />
        </Field>

        <Field label="To" className="w-[10rem]">
          <input
            type="date"
            value={draft.endDate}
            min={coverage?.earliest}
            max={coverage?.latest}
            onChange={(event) => onDraftChange({ ...draft, endDate: event.target.value })}
            className={cn(inputClass, invalid && "border-down")}
          />
        </Field>

        <Field label="Top brokers" className="w-[8rem]">
          <select
            value={draft.topBrokers}
            onChange={(event) =>
              onDraftChange({ ...draft, topBrokers: Number(event.target.value) })
            }
            className={inputClass}
          >
            {TOP_BROKER_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "All" : `Top ${value}`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Market" className="w-[9rem]">
          <select
            value={draft.market}
            onChange={(event) =>
              onDraftChange({ ...draft, market: event.target.value as MarketBoard })
            }
            className={inputClass}
          >
            {MARKET_BOARDS.map((board) => (
              <option key={board} value={board}>
                {BOARD_LABEL[board]}
              </option>
            ))}
          </select>
        </Field>

        <div className="w-fit shrink-0">
          <Button onClick={onAnalyze} disabled={invalid || isLoading} className="px-6">
            {isLoading ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={preset === value}
            onClick={() => onPreset(value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              preset === value
                ? "bg-accent text-accent-ink"
                : "text-ink-muted hover:bg-panel-raised hover:text-ink",
            )}
          >
            {value === "CUSTOM" ? "Custom" : value}
          </button>
        ))}

        {coverage ? (
          <span className="ml-auto text-xs text-ink-faint">
            Data available {formatDayMonth(coverage.earliest)} – {formatDayMonth(coverage.latest)}
          </span>
        ) : null}
      </div>

      {invalid ? (
        <p className="mt-3 rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-xs text-down">
          The start date is after the end date. Swap them to run the analysis.
        </p>
      ) : null}

      {!invalid && dirty ? (
        <p className="mt-3 text-xs text-ink-faint">
          Showing the previous period. Select Analyze to apply the change.
        </p>
      ) : null}
    </section>
  );
}

const inputClass =
  "h-[38px] w-full rounded-lg border border-edge bg-panel-raised px-3 text-sm text-ink focus:border-accent focus:outline-none";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("shrink-0 space-y-1", className)}>
      <span className="block text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
