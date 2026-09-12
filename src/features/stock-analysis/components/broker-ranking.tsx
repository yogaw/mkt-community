"use client";

import { cn } from "@/lib/cn";
import { brokerColor } from "@/features/stock-analysis/broker-colors";
import { directionMark, formatValueSigned, toneFor } from "@/features/stock-analysis/stock-analysis-format";
import type { BrokerFlow } from "@/features/stock-analysis/stock-analysis-types";
import { EmptyPanel } from "./states";

const SIDE_COUNT = 6;

/** The strongest net buyers and sellers, as horizontal bars against one scale. */
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

  const buyers = brokers.filter((broker) => broker.netValue > 0).slice(0, SIDE_COUNT);
  const sellers = brokers
    .filter((broker) => broker.netValue < 0)
    .slice(-SIDE_COUNT)
    .reverse();

  // One scale across both columns, so a bar's length means the same thing on
  // either side of the card.
  const widest = Math.max(
    1,
    ...[...buyers, ...sellers].map((broker) => Math.abs(broker.netValue)),
  );

  return (
    <section className="rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Broker Ranking</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Net value per broker over the selected period.
        </p>
      </header>

      <div className="grid gap-x-8 gap-y-5 p-5 lg:grid-cols-2">
        <Column
          title="Top Buyers"
          mark="▲"
          tone="text-accent"
          brokers={buyers}
          widest={widest}
          onSelectBroker={onSelectBroker}
        />
        <Column
          title="Top Sellers"
          mark="▼"
          tone="text-down"
          brokers={sellers}
          widest={widest}
          onSelectBroker={onSelectBroker}
        />
      </div>
    </section>
  );
}

function Column({
  title,
  mark,
  tone,
  brokers,
  widest,
  onSelectBroker,
}: {
  title: string;
  mark: string;
  tone: string;
  brokers: BrokerFlow[];
  widest: number;
  onSelectBroker: (brokerCode: string) => void;
}) {
  return (
    <div>
      <h3 className={cn("text-xs font-semibold uppercase tracking-wide", tone)}>
        {mark} {title}
      </h3>
      {brokers.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">None in this period.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {brokers.map((broker) => (
            <li key={broker.brokerCode}>
              <BrokerRankingBar broker={broker} widest={widest} onSelect={onSelectBroker} />
            </li>
          ))}
        </ul>
      )}
    </div>
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
      className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex w-12 shrink-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: brokerColor(broker.brokerCode) }}
        />
        <span className="font-mono text-sm font-semibold text-ink">{broker.brokerCode}</span>
      </span>

      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-panel-raised">
        <span
          className={cn("block h-full rounded-full", broker.netValue >= 0 ? "bg-accent" : "bg-down")}
          style={{ width: `${share}%` }}
        />
      </span>

      <span className={cn("w-28 shrink-0 text-right text-sm font-semibold whitespace-nowrap", toneFor(broker.netValue))}>
        {directionMark(broker.netValue)} {formatValueSigned(broker.netValue)}
      </span>
    </button>
  );
}
