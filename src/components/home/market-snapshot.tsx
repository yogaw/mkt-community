"use client";

import { useState, useSyncExternalStore } from "react";
import { formatPrice } from "@/lib/datetime/format";
import { formatRupiahFlow, formatRupiahShort } from "@/lib/datetime/rupiah";
import { isStoredUserAdmin } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import type { MarketIndexSnapshotDto } from "@/features/market-index/market-index-types";
import { UpdateMarketIndexModal } from "@/features/market-index/components/update-market-index-modal";

/** The stored session cannot change role without a fresh sign-in. */
function subscribeToSession(): () => void {
  return () => {};
}

function formatCapturedAt(value: string): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `as of ${day}, ${time} WIB`;
}

interface MarketSnapshotProps {
  snapshot: MarketIndexSnapshotDto | null;
  onUpdated: (snapshot: MarketIndexSnapshotDto) => void;
}

export function MarketSnapshot({ snapshot, onUpdated }: MarketSnapshotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = useSyncExternalStore(subscribeToSession, isStoredUserAdmin, () => false);

  const isUp = (snapshot?.changePercent ?? 0) >= 0;

  return (
    <section
      aria-label="Indonesia market snapshot"
      className="rounded-xl border border-edge bg-panel px-5 py-4 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Indonesia Market
        </p>
        {snapshot ? (
          <span className="text-xs text-ink-faint">{formatCapturedAt(snapshot.capturedAt)}</span>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ml-auto rounded-lg border border-edge bg-panel-raised px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            {snapshot ? "Update" : "Post today's close"}
          </button>
        ) : null}
      </div>

      {snapshot === null ? (
        <p className="mt-3 text-sm text-ink-muted">
          No index snapshot posted yet.
          {isAdmin ? " Post today's close to fill this in." : ""}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-semibold text-ink">{snapshot.indexName}</span>
            <span className="text-2xl font-semibold tracking-tight text-ink">
              {formatPrice(snapshot.value, 2)}
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                isUp ? "bg-accent/10 text-accent" : "bg-down/10 text-down",
              )}
            >
              {isUp ? "+" : ""}
              {snapshot.changePercent.toFixed(2)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto">
            <Stat label="Turnover" value={formatRupiahShort(snapshot.turnoverIdr)} />
            <Stat
              label="Foreign Flow"
              value={formatRupiahFlow(snapshot.foreignFlowIdr)}
              tone={snapshot.foreignFlowIdr >= 0 ? "up" : "down"}
            />
            <Stat label="Adv / Dec" value={`${snapshot.advancers} / ${snapshot.decliners}`} />
          </div>
        </div>
      )}

      {isAdmin ? (
        <UpdateMarketIndexModal
          open={isOpen}
          latest={snapshot}
          onClose={() => setIsOpen(false)}
          onSaved={(next) => {
            setIsOpen(false);
            onUpdated(next);
          }}
        />
      ) : null}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          tone === "up" ? "text-accent" : tone === "down" ? "text-down" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
