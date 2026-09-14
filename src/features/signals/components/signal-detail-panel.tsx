"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/datetime/format";
import { formatPercent, toReturnTone } from "@/features/signals/signal-display";
import { SignalStatusBadge, SignalTypeBadge } from "./signal-badges";
import { SignalTimeline } from "./signal-timeline";
import type { SignalDetailDto } from "@/features/signals/signal-types";

interface DetailFactProps {
  label: string;
  value: string;
  note?: string;
  noteTone?: string;
  valueTone?: string;
}

function DetailFact({ label, value, note, noteTone, valueTone }: DetailFactProps) {
  return (
    <div className="rounded-lg border border-edge bg-panel-raised px-3 py-2.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", valueTone ?? "text-ink")}>{value}</p>
      {note ? <p className={cn("text-xs", noteTone ?? "text-ink-faint")}>{note}</p> : null}
    </div>
  );
}

export function SignalDetailPanelSkeleton() {
  return (
    <div className="rounded-xl border border-edge bg-panel p-6">
      <Skeleton className="h-7 w-48 rounded-lg" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

interface SignalDetailPanelProps {
  signal: SignalDetailDto;
  onToggleWatchlist: () => void;
  isTogglePending: boolean;
}

export function SignalDetailPanel({
  signal,
  onToggleWatchlist,
  isTogglePending,
}: SignalDetailPanelProps) {
  return (
    <section
      aria-label={`${signal.ticker} signal detail`}
      className="rounded-xl border border-edge bg-panel p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{signal.ticker}</h2>
            <p className="text-sm text-ink-muted">{signal.companyName}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SignalStatusBadge status={signal.status} />
            <SignalTypeBadge type={signal.type} />
            <span className="text-xs text-ink-faint">
              Signal issued {formatDate(signal.issuedAt)}
            </span>
          </div>
        </div>

        {/* Button lays itself out full-width; this wrapper shrinks it back to its label. */}
        <div className="shrink-0">
          <Button
            variant={signal.isWatchlisted ? "secondary" : "primary"}
            onClick={onToggleWatchlist}
            disabled={isTogglePending}
            className="px-4"
          >
            {signal.isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Key Trade Details</h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <DetailFact
              label="Entry Range"
              value={`${formatPrice(signal.entryLow)} – ${formatPrice(signal.entryHigh)}`}
            />
            <DetailFact
              label="Current Price"
              value={formatPrice(signal.currentPrice)}
              note={`${formatPercent(signal.returnPercent)} from entry`}
              noteTone={toReturnTone(signal.returnPercent)}
            />
            <DetailFact
              label="Target 1"
              value={formatPrice(signal.target1)}
              note={formatPercent(signal.target1UpsidePercent)}
              noteTone={toReturnTone(signal.target1UpsidePercent)}
            />
            {signal.target2 === null ? null : (
              <DetailFact
                label="Target 2"
                value={formatPrice(signal.target2)}
                note={formatPercent(signal.target2UpsidePercent ?? 0)}
                noteTone={toReturnTone(signal.target2UpsidePercent ?? 0)}
              />
            )}
            <DetailFact
              label="Stop Loss"
              value={formatPrice(signal.stopLoss)}
              note={formatPercent(signal.stopLossDownsidePercent)}
              noteTone={toReturnTone(signal.stopLossDownsidePercent)}
            />
            <DetailFact label="Time Horizon" value={signal.timeHorizon} />
            <DetailFact label="Risk / Reward" value={signal.riskReward} />
          </div>

          <h3 className="mt-6 text-sm font-semibold text-ink">Thesis</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{signal.thesis}</p>

          {signal.chartImages.length > 0 ? (
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {signal.chartImages.map((url) => (
                <li key={url} className="overflow-hidden rounded-lg border border-edge bg-panel-raised">
                  <a href={url} target="_blank" rel="noreferrer" aria-label="Open chart full size">
                    <Image
                      src={url}
                      alt={`${signal.ticker} chart`}
                      width={640}
                      height={400}
                      unoptimized
                      className="h-auto w-full"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {signal.keyCatalysts.length > 0 ? (
            <>
              <h3 className="mt-6 text-sm font-semibold text-ink">Key Catalysts</h3>
              <ul className="mt-2 space-y-1.5">
                {signal.keyCatalysts.map((catalyst) => (
                  <li key={catalyst} className="flex gap-2.5 text-sm text-ink-muted">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    />
                    {catalyst}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="min-w-0 rounded-xl border border-edge bg-panel-raised/40 p-4">
          <h3 className="mb-4 text-sm font-semibold text-ink">Signal Timeline</h3>
          <SignalTimeline timeline={signal.timeline} />
        </div>
      </div>
    </section>
  );
}
