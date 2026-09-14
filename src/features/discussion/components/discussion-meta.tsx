import { formatJakartaDateTime, formatCount, pluralize } from "@/features/discussion/discussion-display";
import type { ThreadDetailDto } from "@/features/discussion/discussion-types";
import { CategoryBadge, DiscussionStatusBadge, TagBadge, TickerBadge } from "./badges";

/** Category, tags, activity and the publication stamp, in the market's clock. */
export function DiscussionMeta({ thread }: { thread: ThreadDetailDto }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={thread.category} />
        <DiscussionStatusBadge status={thread.status} />
        {thread.isPinned ? (
          <span className="rounded-full bg-down/10 px-2.5 py-1 text-xs font-semibold text-down">
            Pinned
          </span>
        ) : null}
        {thread.isFeatured ? (
          <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
            Featured
          </span>
        ) : null}
        {thread.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-faint">
        <span>{pluralize(thread.commentCount, "comment")}</span>
        <span>{formatCount(thread.viewCount)} views</span>
        {thread.publishedAt ? (
          <span>Published {formatJakartaDateTime(thread.publishedAt)}</span>
        ) : (
          <span>Not published yet</span>
        )}
      </div>

      {thread.tickers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-faint">Tickers</span>
          {thread.tickers.map((ticker) => (
            <TickerBadge key={ticker} ticker={ticker} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
