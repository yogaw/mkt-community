"use client";

import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/datetime/format";
import { formatPercent, toReturnTone } from "@/features/signals/signal-display";
import { SignalStatusBadge, SignalTypeBadge } from "./signal-badges";
import type { SignalRowDto } from "@/features/signals/signal-types";

const headClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint";
const cellClass = "px-4 py-3 text-sm whitespace-nowrap";

interface SignalTableProps {
  signals: SignalRowDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleWatchlist: (signal: SignalRowDto) => void;
  pendingWatchlistId: string | null;
}

export function SignalTable({
  signals,
  selectedId,
  onSelect,
  onToggleWatchlist,
  pendingWatchlistId,
}: SignalTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge bg-panel">
      <table className="w-full min-w-[960px] border-collapse">
        <thead>
          <tr className="border-b border-edge">
            <th scope="col" className={headClass}>Stock</th>
            <th scope="col" className={headClass}>Type</th>
            <th scope="col" className={headClass}>Entry</th>
            <th scope="col" className={headClass}>Current</th>
            <th scope="col" className={headClass}>Target</th>
            <th scope="col" className={headClass}>Stop Loss</th>
            <th scope="col" className={headClass}>Return</th>
            <th scope="col" className={headClass}>Status</th>
            <th scope="col" className={headClass}>Date</th>
            <th scope="col" className={cn(headClass, "text-right")}>Watchlist</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {signals.map((signal) => {
            const isSelected = signal.id === selectedId;
            return (
              <tr
                key={signal.id}
                aria-selected={isSelected}
                onClick={() => onSelect(signal.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected ? "bg-accent/5" : "hover:bg-panel-raised",
                )}
              >
                <td className={cellClass}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(signal.id);
                    }}
                    className="text-left font-semibold text-ink hover:text-accent"
                  >
                    {signal.ticker}
                  </button>
                </td>
                <td className={cellClass}>
                  <SignalTypeBadge type={signal.type} />
                </td>
                <td className={cn(cellClass, "text-ink-muted")}>
                  {formatPrice(signal.entryLow)} – {formatPrice(signal.entryHigh)}
                </td>
                <td className={cn(cellClass, "font-medium text-ink")}>
                  {formatPrice(signal.currentPrice)}
                </td>
                <td className={cn(cellClass, "text-ink-muted")}>
                  {formatPrice(signal.target1)}
                  {signal.target2 === null ? "" : ` / ${formatPrice(signal.target2)}`}
                </td>
                <td className={cn(cellClass, "text-ink-muted")}>{formatPrice(signal.stopLoss)}</td>
                <td className={cn(cellClass, "font-semibold", toReturnTone(signal.returnPercent))}>
                  {formatPercent(signal.returnPercent)}
                </td>
                <td className={cellClass}>
                  <SignalStatusBadge status={signal.status} />
                </td>
                <td className={cn(cellClass, "text-ink-muted")}>{formatDate(signal.issuedAt)}</td>
                <td className={cn(cellClass, "text-right")}>
                  <button
                    type="button"
                    disabled={pendingWatchlistId === signal.id}
                    aria-pressed={signal.isWatchlisted}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleWatchlist(signal);
                    }}
                    aria-label={
                      signal.isWatchlisted
                        ? `Remove ${signal.ticker} from watchlist`
                        : `Add ${signal.ticker} to watchlist`
                    }
                    className={cn(
                      "rounded-lg p-1.5 transition-colors disabled:opacity-50",
                      signal.isWatchlisted
                        ? "text-accent hover:text-accent-strong"
                        : "text-ink-faint hover:text-ink",
                    )}
                  >
                    <StarIcon filled={signal.isWatchlisted} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M8 1.9l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.7l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
