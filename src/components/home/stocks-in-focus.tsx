import Link from "next/link";
import { formatPrice } from "@/lib/datetime/format";
import { cn } from "@/lib/cn";
import { formatPercent, toReturnTone } from "@/features/signals/signal-display";
import { SignalStatusBadge, SignalTypeBadge } from "@/features/signals/components/signal-badges";
import type { SignalRowDto } from "@/features/signals/signal-types";

/*
 * Driven by the open signals rather than a hand-kept list, so the dashboard and
 * the Signals page can never disagree about what is being watched.
 *
 * A card shows the trade setup — entry, target, stop — rather than a paragraph
 * of thesis. The prose belongs on the signal itself, one click away, and the
 * levels are what a member checks at a glance.
 */
export function StocksInFocus({ signals }: { signals: SignalRowDto[] }) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <section aria-label="Stocks in focus">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Stocks in Focus</h2>
        <Link
          href="/signals"
          className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
        >
          All Signals &rarr;
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => (
          <article
            key={signal.id}
            className="flex flex-col rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-ink-faint"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink">{signal.ticker}</h3>
                <p className="mt-0.5 truncate text-xs text-ink-faint">{signal.companyName}</p>
              </div>
              <span className={cn("shrink-0 text-sm font-semibold", toReturnTone(signal.returnPercent))}>
                {formatPercent(signal.returnPercent)}
              </span>
            </div>

            <p className="mt-3 text-lg font-semibold tracking-tight text-ink">
              {formatPrice(signal.currentPrice)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <SignalStatusBadge status={signal.status} />
              <SignalTypeBadge type={signal.type} />
            </div>

            <dl className="mt-4 flex-1 space-y-1.5 text-xs">
              <Level label="Entry" value={`${formatPrice(signal.entryLow)} – ${formatPrice(signal.entryHigh)}`} />
              <Level
                label="Target"
                value={
                  signal.target2 === null
                    ? formatPrice(signal.target1)
                    : `${formatPrice(signal.target1)} / ${formatPrice(signal.target2)}`
                }
              />
              <Level label="Stop" value={formatPrice(signal.stopLoss)} tone="down" />
            </dl>

            <Link
              href="/signals"
              className="mt-4 text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              View Signal &rarr;
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone?: "down" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={cn("font-semibold", tone === "down" ? "text-down" : "text-ink")}>{value}</dd>
    </div>
  );
}
