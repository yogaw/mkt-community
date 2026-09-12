"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  directionMark,
  formatLotsPlain,
  formatPercentSigned,
  formatPrice,
  formatRupiah,
  formatUpdatedAt,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { StockOverview } from "@/features/stock-analysis/stock-analysis-types";
import { InfoTooltip, TERMS } from "./info-tooltip";

/** Identity, price, market status, and the actions available on this stock. */
export function StockHeader({
  overview,
  isWatchlistBusy,
  shareLabel,
  onToggleWatchlist,
  onShare,
}: {
  overview: StockOverview;
  isWatchlistBusy: boolean;
  shareLabel: string;
  onToggleWatchlist: () => void;
  onShare: () => void;
}) {
  const { snapshot, watchlist } = overview;
  const change = snapshot.change ?? 0;

  return (
    <header className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-ink">
              {snapshot.ticker}
            </h1>
            <p className="text-sm text-ink-muted">{snapshot.name ?? "Company name not available"}</p>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            IDX · Sector not available in this dataset
          </p>

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight text-ink">
              {snapshot.lastPrice === null ? "—" : formatPrice(snapshot.lastPrice)}
            </span>
            <span className={cn("text-sm font-semibold", toneFor(change))}>
              {directionMark(change)} {snapshot.change === null ? "—" : formatPrice(snapshot.change)}{" "}
              ({formatPercentSigned(snapshot.changePercent)})
            </span>
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              Market closed · end-of-day data
            </span>
            <span>Last session {snapshot.tradingDate ?? "unknown"}</span>
            <span>Updated {formatUpdatedAt(snapshot.lastUpdated)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {watchlist.supported ? (
            <div className="w-fit shrink-0">
              <Button
                variant={watchlist.watchlisted ? "secondary" : "primary"}
                onClick={onToggleWatchlist}
                disabled={isWatchlistBusy}
                className="px-4"
              >
                {watchlist.watchlisted ? "Saved to Watchlist" : "Add to Watchlist"}
              </Button>
            </div>
          ) : (
            <p className="max-w-[15rem] rounded-lg border border-dashed border-edge px-3 py-2 text-xs text-ink-faint">
              Piranha&rsquo;s watchlist tracks published signals, not tickers. {snapshot.ticker} has
              no signal to follow yet.
            </p>
          )}

          <div className="w-fit shrink-0">
            <Button variant="secondary" onClick={onShare} className="px-4">
              {shareLabel}
            </Button>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-edge pt-4 sm:grid-cols-3 xl:grid-cols-5">
        <Stat
          label="Day range"
          value={
            snapshot.dayLow === null || snapshot.dayHigh === null
              ? "—"
              : `${formatPrice(snapshot.dayLow)} – ${formatPrice(snapshot.dayHigh)}`
          }
        />
        <Stat label="Previous close" value={snapshot.previousClose === null ? "—" : formatPrice(snapshot.previousClose)} />
        <Stat label="Volume" value={snapshot.volumeLots === null ? "—" : `${formatLotsPlain(snapshot.volumeLots)} lots`} />
        <Stat label="Value traded" value={snapshot.valueTraded === null ? "—" : formatRupiah(snapshot.valueTraded)} />
        <Stat
          label="Foreign net"
          tooltip="Implied from foreign buy and sell volume at the day's close, so it is an approximation. The exact figure comes from broker data."
          value={snapshot.foreignNetValue === null ? "—" : formatValueSigned(snapshot.foreignNetValue)}
          tone={snapshot.foreignNetValue === null ? undefined : toneFor(snapshot.foreignNetValue)}
        />
      </dl>

      {overview.signal || overview.discussions.length > 0 ? (
        <div className="mt-4 grid gap-3 border-t border-edge pt-4 lg:grid-cols-2">
          {overview.signal ? <SignalCard overview={overview} /> : null}
          {overview.discussions.length > 0 ? <DiscussionCard overview={overview} /> : null}
        </div>
      ) : null}
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  tone?: string;
  tooltip?: string;
}) {
  return (
    <div>
      <dt className="flex items-center text-xs text-ink-faint">
        {label}
        {tooltip ? <InfoTooltip label={label}>{tooltip}</InfoTooltip> : null}
      </dt>
      <dd className={cn("mt-0.5 text-sm font-semibold whitespace-nowrap", tone ?? "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

/** Read from the Signals module; Stock Analysis never stores a signal. */
function SignalCard({ overview }: { overview: StockOverview }) {
  const signal = overview.signal!;

  return (
    <section className="rounded-lg border border-accent/30 bg-accent/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Piranha Signal</h2>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
          {signal.status.replace(/_/g, " ")}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Entry" value={`${formatPrice(signal.entryLow)}–${formatPrice(signal.entryHigh)}`} />
        <Stat
          label="Target"
          value={signal.target2 === null ? formatPrice(signal.target1) : `${formatPrice(signal.target1)} / ${formatPrice(signal.target2)}`}
        />
        <Stat label="Stop loss" value={formatPrice(signal.stopLoss)} tone="text-down" />
      </dl>

      <Link
        href="/signals"
        className="mt-3 inline-block text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
      >
        View Full Signal &rarr;
      </Link>
    </section>
  );
}

/** Read from the Discussion module, matched on the thread's own ticker list. */
function DiscussionCard({ overview }: { overview: StockOverview }) {
  return (
    <section className="rounded-lg border border-edge bg-panel-raised/30 p-4">
      <h2 className="text-sm font-semibold text-ink">Related Discussions</h2>
      <ul className="mt-2 divide-y divide-edge">
        {overview.discussions.map((discussion) => (
          <li key={discussion.id}>
            <Link
              href={`/discussion/${discussion.id}`}
              className="block py-2 text-sm text-ink transition-colors hover:text-accent"
            >
              {discussion.title}
              <span className="mt-0.5 block text-xs text-ink-faint">
                {discussion.commentCount} {discussion.commentCount === 1 ? "comment" : "comments"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { TERMS };
