"use client";

import { cn } from "@/lib/cn";
import { brokerColor } from "@/features/stock-analysis/broker-colors";
import {
  directionMark,
  directionWord,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { BrokerFlow } from "@/features/stock-analysis/stock-analysis-types";
import { EmptyPanel } from "./states";

const SHOWN = 8;

/**
 * The brokers that moved the period, buyers and sellers in one list.
 *
 * Ranked by how much each moved rather than split into two columns: the story
 * of a period is usually a specific desk accumulating *against* a specific desk
 * selling, and two separate lists make that pairing something the reader has to
 * assemble. One scale across the whole list means a bar's length compares
 * directly to every other bar.
 */
export function BrokerRanking({
  brokers,
  onSelectBroker,
}: {
  brokers: BrokerFlow[];
  onSelectBroker: (brokerCode: string) => void;
}) {
  if (brokers.length === 0) {
    return (
      <EmptyPanel
        title="No broker ranking for this period."
        description="No broker transactions were recorded in the selected range."
      />
    );
  }

  const ranked = [...brokers]
    .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue))
    .slice(0, SHOWN);
  const widest = Math.max(1, ...ranked.map((broker) => Math.abs(broker.netValue)));

  return (
    <section className="min-w-0 rounded-xl border border-edge bg-panel">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-edge px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Broker Ranking</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Largest net buyers and sellers over the selected period.
          </p>
        </div>
        <span className="shrink-0 text-xs text-ink-faint">
          {Math.min(SHOWN, brokers.length)} of {brokers.length} brokers
        </span>
      </header>

      <ul className="space-y-1 p-4">
        {ranked.map((broker) => (
          <li key={broker.brokerCode}>
            <BrokerRankingBar broker={broker} widest={widest} onSelect={onSelectBroker} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BrokerRankingBar({
  broker,
  widest,
  onSelect,
}: {
  broker: BrokerFlow;
  widest: number;
  onSelect: (brokerCode: string) => void;
}) {
  const share = Math.min(100, (Math.abs(broker.netValue) / widest) * 100);

  return (
    <button
      type="button"
      onClick={() => onSelect(broker.brokerCode)}
      title={`${broker.brokerCode} · net ${directionWord(broker.netValue).toLowerCase()}`}
      className="flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex w-11 shrink-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: brokerColor(broker.brokerCode) }}
        />
        <span className="font-mono text-sm font-semibold text-ink">{broker.brokerCode}</span>
      </span>

      <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-panel-raised">
        <span
          className={cn("block h-full rounded-full", broker.netValue >= 0 ? "bg-accent" : "bg-down")}
          style={{ width: `${share}%` }}
        />
      </span>

      <span
        className={cn(
          "w-[6.5rem] shrink-0 text-right text-sm font-semibold whitespace-nowrap",
          toneFor(broker.netValue),
        )}
      >
        {directionMark(broker.netValue)} {formatValueSigned(broker.netValue)}
      </span>
    </button>
  );
}
