import { cn } from "@/lib/cn";
import { formatTradingDate } from "@/features/market-overview/market-format";
import {
  DATA_STATUS_LABEL,
  type DataStatus,
  type Instrument,
} from "@/features/market-data/market-data-model";

/*
 * Provenance is part of the number, not a footnote. Every instrument on screen
 * carries who published it and how current it is, because "4.97" means
 * different things live, delayed and end-of-day.
 */
const STATUS_TONE: Record<DataStatus, string> = {
  LIVE: "bg-accent/10 text-accent",
  DELAYED: "bg-warn/10 text-warn",
  END_OF_DAY: "bg-panel-raised text-ink-muted",
  OFFICIAL_RELEASE: "bg-info/10 text-info",
  SAMPLE: "bg-down/10 text-down",
};

export function DataFreshnessBadge({
  status,
  delayMinutes,
  className,
}: {
  status: DataStatus;
  delayMinutes: number | null;
  className?: string;
}) {
  const label =
    status === "DELAYED" && delayMinutes
      ? `Delayed ${delayMinutes} min`
      : DATA_STATUS_LABEL[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_TONE[status],
        className,
      )}
    >
      {status === "SAMPLE" ? <WarnIcon /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function DataSourceBadge({ instrument }: { instrument: Instrument }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
      <span>
        Source: <span className="font-medium text-ink-muted">{instrument.source}</span>
      </span>
      <DataFreshnessBadge status={instrument.dataStatus} delayMinutes={instrument.delayMinutes} />
      <span>Updated {formatTradingDate(instrument.timestamp)}</span>
      {instrument.dataStatus === "SAMPLE" ? (
        <span className="text-down">
          Generated placeholder — this feed is not connected, and these rows do not appear
          in production.
        </span>
      ) : null}
    </div>
  );
}

/** Whether the exchange behind an instrument is open right now, in its own hours. */
export function MarketStatus({ section }: { section: "global" | "indonesia" | "commodities" }) {
  const now = new Date();
  // IDX trades roughly 09:00-16:00 WIB on weekdays. Everything else spans
  // sessions we do not model, so only Indonesia claims open or closed.
  const wibHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(now),
  );
  const wibDay = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getDay();
  const isWeekday = wibDay >= 1 && wibDay <= 5;
  const isOpen = section === "indonesia" && isWeekday && wibHour >= 9 && wibHour < 16;

  if (section !== "indonesia") {
    return <span className="text-xs text-ink-faint">Multiple sessions</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", isOpen ? "text-accent" : "text-ink-faint")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isOpen ? "bg-accent" : "bg-ink-faint")} />
      {isOpen ? "IDX open" : "IDX closed"}
    </span>
  );
}

/**
 * Shown when a series has fallen behind the rest of the page.
 *
 * The threshold is days rather than "older than the freshest", because
 * different venues close on different calendars: crypto prints on a Sunday,
 * IDX does not, and a one-day offset between them is normal. Anything past a
 * weekend is not.
 */
const STALE_AFTER_DAYS = 3;

export function StaleWarning({ observedAt, latest }: { observedAt: string; latest: string }) {
  const gap = Math.round(
    (Date.parse(`${latest}T00:00:00Z`) - Date.parse(`${observedAt}T00:00:00Z`)) / 86400000,
  );
  if (!Number.isFinite(gap) || gap <= STALE_AFTER_DAYS) {
    return null;
  }
  return (
    <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
      This series last updated {formatTradingDate(observedAt)}, {gap} days behind the rest of
      the page ({formatTradingDate(latest)}). It may not reflect the most recent session.
    </p>
  );
}

function WarnIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5l6 11H2l6-11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.8v3M8 11.7v.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
