import { formatDateRange, formatUpdatedAt } from "@/features/stock-analysis/stock-analysis-format";

/**
 * Where the numbers came from, what they cover, and when they last moved.
 *
 * On every broker-analysis screen, because a figure with no provenance is not
 * research. It never says "live": this is an end-of-day ingestion and the line
 * says so.
 */
export function DataSourceBadge({
  source,
  startDate,
  endDate,
  lastUpdated,
}: {
  source: string;
  startDate: string;
  endDate: string;
  lastUpdated: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
      <span>
        Source: <span className="font-medium text-ink-muted">{source}</span>
      </span>
      <span>{formatDateRange(startDate, endDate)}</span>
      <span>Updated {formatUpdatedAt(lastUpdated)}</span>
      <span className="rounded-full bg-panel-raised px-2 py-0.5 font-semibold">End of day</span>
    </div>
  );
}
