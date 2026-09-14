import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/datetime/format";
import { CATEGORY_STYLE, formatCount, pluralize } from "@/features/discussion/discussion-display";
import type { ThreadSummaryDto } from "@/features/discussion/discussion-types";
import { CategoryBadge, DiscussionStatusBadge, TickerBadge } from "./badges";
import { CategoryIcon } from "./category-icon";

/**
 * One row in the feed: a pointer to a thread, not a post in a timeline. The
 * whole row is a link, so it is reachable by keyboard and opens in a new tab
 * with the modifier keys a reader already knows.
 */
export function DiscussionListItem({ thread }: { thread: ThreadSummaryDto }) {
  const style = CATEGORY_STYLE[thread.category];

  return (
    <Link
      href={`/discussion/${thread.id}`}
      className={cn(
        "flex gap-4 px-5 py-4 transition-colors hover:bg-panel-raised/50",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
      )}
    >
      {/* 16:9 at 80px. A thread with no cover falls back to its category mark
          rather than a broken image or an empty grey box. */}
      <span className="hidden h-[3.25rem] w-20 shrink-0 overflow-hidden rounded-lg sm:block">
        {thread.thumbnailUrl ? (
          <Image
            src={thread.thumbnailUrl}
            alt=""
            width={160}
            height={104}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className={cn("flex h-full w-full items-center justify-center", style.tint)}>
            <CategoryIcon category={thread.category} className="h-6 w-6" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{thread.title}</span>
              <DiscussionStatusBadge status={thread.status} />
              {thread.isNew ? (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  New
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-sm text-ink-muted">{thread.excerpt}</span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {thread.isFeatured ? (
              <span
                title="Featured"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-warn/10 text-warn"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.6z" />
                </svg>
                <span className="sr-only">Featured</span>
              </span>
            ) : null}
            {thread.isPinned ? (
              <span
                title="Pinned"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-down/10 text-down"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M9.8 1.4a1 1 0 011.4 0l3.4 3.4a1 1 0 010 1.4l-.7.7a1 1 0 01-1.2.2l-1.3 1.9.6.6a1 1 0 010 1.4l-.7.7a1 1 0 01-1.4 0L7.1 9.4l-4.4 4.4a.7.7 0 01-1-1l4.4-4.4-2.3-2.3a1 1 0 010-1.4l.7-.7a1 1 0 011.4 0l.6.6 1.9-1.3a1 1 0 01.2-1.2l.7-.7z" />
                </svg>
                <span className="sr-only">Pinned</span>
              </span>
            ) : null}
            {thread.isLocked ? (
              <span className="rounded-full bg-panel-raised px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
                Locked
              </span>
            ) : null}
          </span>
        </span>

        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoryBadge category={thread.category} />
          {thread.tickers.slice(0, 2).map((ticker) => (
            <TickerBadge key={ticker} ticker={ticker} />
          ))}

          <span
            className="flex items-center gap-1 text-xs text-ink-faint"
            title={pluralize(thread.commentCount, "comment")}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M2.5 4.2a1.2 1.2 0 011.2-1.2h8.6a1.2 1.2 0 011.2 1.2v5.4a1.2 1.2 0 01-1.2 1.2H6.4L3.4 13.3a.4.4 0 01-.64-.32V4.2z" strokeLinejoin="round" />
            </svg>
            {formatCount(thread.commentCount)}
            <span className="sr-only"> comments</span>
          </span>

          {/* Views are the first thing to go when the row gets narrow: the
              comment count is what tells a reader whether to open it. */}
          <span
            className="hidden items-center gap-1 text-xs text-ink-faint sm:flex"
            title={`${thread.viewCount.toLocaleString("en-US")} views`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M1.4 8s2.5-4.3 6.6-4.3S14.6 8 14.6 8s-2.5 4.3-6.6 4.3S1.4 8 1.4 8z" />
              <circle cx="8" cy="8" r="1.9" />
            </svg>
            {formatCount(thread.viewCount)}
            <span className="sr-only"> views</span>
          </span>

          <span className="ml-auto text-xs text-ink-faint">
            {formatDate(thread.publishedAt ?? thread.createdAt)}
          </span>
        </span>
      </span>
    </Link>
  );
}
