import { cn } from "@/lib/cn";
import { CATEGORY_STYLE, STATUS_LABEL } from "@/features/discussion/discussion-display";
import type { DiscussionCategory, DiscussionStatus } from "@/features/discussion/discussion-types";

/** The category a thread sits in, in that category's own colour. */
export function CategoryBadge({
  category,
  className,
}: {
  category: DiscussionCategory;
  className?: string;
}) {
  const style = CATEGORY_STYLE[category];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
        style.chip,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

const STATUS_TONE: Record<DiscussionStatus, string> = {
  DRAFT: "bg-warn/10 text-warn",
  PUBLISHED: "bg-accent/10 text-accent",
  ARCHIVED: "bg-panel-raised text-ink-faint",
};

/**
 * Only shown for drafts and archives. Labelling the normal case "Published"
 * everywhere would be noise on every row.
 */
export function DiscussionStatusBadge({ status }: { status: DiscussionStatus }) {
  if (status === "PUBLISHED") {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * An IDX ticker. There is no stock detail route in the app yet, so this renders
 * as a badge rather than a link — a link to nowhere is worse than plain text.
 * When that route exists, this is the one component to change.
 */
export function TickerBadge({ ticker }: { ticker: string }) {
  return (
    <span className="inline-block rounded-md border border-edge bg-panel-raised px-2 py-0.5 font-mono text-xs font-semibold text-ink-muted">
      {ticker}
    </span>
  );
}

/** A free-text topic. Clicking filters the board by it. */
export function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-block rounded-full bg-panel-raised px-2.5 py-0.5 text-xs text-ink-muted">
      #{tag}
    </span>
  );
}

export function AdminBadge({ title }: { title: string | null }) {
  return (
    <span className="inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      {title ?? "Admin"}
    </span>
  );
}
