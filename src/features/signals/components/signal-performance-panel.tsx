"use client";

import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatPercent,
  signalTypeLabel,
  toReturnTone,
} from "@/features/signals/signal-display";
import type { SignalPerformanceDto } from "@/features/signals/signal-types";

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={cn("mt-1.5 text-xl font-semibold tracking-tight", tone ?? "text-ink")}>
        {value}
      </p>
    </div>
  );
}

export function SignalPerformancePanel({ performance }: { performance: SignalPerformanceDto }) {
  if (performance.closed === 0) {
    return (
      <EmptyState
        title="No closed signals yet"
        description="Performance is measured from signals that have been closed out. Once the first one closes, its numbers appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Win Rate" value={`${performance.winRatePercent}%`} tone="text-accent" />
        <Figure
          label="Closed Signals"
          value={`${performance.closed}`}
        />
        <Figure
          label="Average Return"
          value={formatPercent(performance.averageReturnPercent)}
          tone={toReturnTone(performance.averageReturnPercent)}
        />
        <Figure
          label="Wins / Losses"
          value={`${performance.wins} / ${performance.losses}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-edge bg-panel p-5">
          <h3 className="text-sm font-semibold text-ink">Average Outcome</h3>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Average win</dt>
              <dd className="font-semibold text-accent">
                {formatPercent(performance.averageWinPercent)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Average loss</dt>
              <dd className="font-semibold text-down">
                {formatPercent(performance.averageLossPercent)}
              </dd>
            </div>
            {performance.best ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-muted">Best signal</dt>
                <dd className="font-semibold text-ink">
                  {performance.best.ticker}{" "}
                  <span className="text-accent">
                    {formatPercent(performance.best.returnPercent)}
                  </span>
                </dd>
              </div>
            ) : null}
            {performance.worst ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-muted">Worst signal</dt>
                <dd className="font-semibold text-ink">
                  {performance.worst.ticker}{" "}
                  <span className="text-down">
                    {formatPercent(performance.worst.returnPercent)}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-xl border border-edge bg-panel p-5">
          <h3 className="text-sm font-semibold text-ink">By Signal Type</h3>
          <ul className="mt-3 space-y-3">
            {performance.byType.map((row) => (
              <li key={row.type}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-ink">{signalTypeLabel[row.type]}</span>
                  <span className="text-ink-muted">
                    {row.wins}/{row.closed} ·{" "}
                    <span className={toReturnTone(row.averageReturnPercent)}>
                      {formatPercent(row.averageReturnPercent)}
                    </span>
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-raised"
                  role="img"
                  aria-label={`${signalTypeLabel[row.type]} win rate ${row.winRatePercent} percent`}
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${row.winRatePercent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
