"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { PaginationMeta } from "@/lib/api/pagination";
import { CATEGORY_LABEL, type DiscussionCategory, type ThreadSort } from "@/features/discussion/discussion-types";
import { DiscussionFilters } from "./discussion-filters";
import { DiscussionListItem } from "./discussion-list-item";
import { FeedSkeleton } from "./discussion-skeletons";
import type { ThreadSummaryDto } from "@/features/discussion/discussion-types";

export type FeedStatus = "loading" | "ready" | "error";

export function DiscussionFeed({
  status,
  threads,
  pagination,
  category,
  search,
  sort,
  canCreate,
  isLoadingMore,
  onSortChange,
  onRetry,
  onLoadMore,
  onCreate,
}: {
  status: FeedStatus;
  threads: ThreadSummaryDto[];
  pagination: PaginationMeta | null;
  category: DiscussionCategory | null;
  search: string;
  sort: ThreadSort;
  canCreate: boolean;
  isLoadingMore: boolean;
  onSortChange: (sort: ThreadSort) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onCreate: () => void;
}) {
  const heading = category === null ? "Latest Discussions" : CATEGORY_LABEL[category];
  const hasMore = pagination !== null && threads.length < pagination.totalItems;

  return (
    <section className="min-w-0 rounded-xl border border-edge bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{heading}</h2>
        <DiscussionFilters sort={sort} onSortChange={onSortChange} />
      </div>

      {status === "loading" ? <FeedSkeleton /> : null}

      {status === "error" ? (
        <div className="p-10 text-center">
          <p className="font-medium text-ink">We could not load the discussions.</p>
          <p className="mt-1 text-sm text-ink-muted">
            The request did not come back. Nothing has been lost — try again.
          </p>
          <Button onClick={onRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && threads.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title={emptyTitle(search, category)}
            description={
              canCreate
                ? "Create the first discussion and get the conversation going."
                : "New discussions are published by the Piranha desk. Check back shortly."
            }
            action={
              canCreate ? (
                <Button onClick={onCreate} className="w-auto px-6">
                  New Discussion
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : null}

      {status === "ready" && threads.length > 0 ? (
        <>
          <ul className="divide-y divide-edge">
            {threads.map((thread) => (
              <li key={thread.id}>
                <DiscussionListItem thread={thread} />
              </li>
            ))}
          </ul>

          {hasMore ? (
            <div className="border-t border-edge px-5 py-4">
              <div className="mx-auto w-fit">
                <Button
                  variant="secondary"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="px-6"
                >
                  {isLoadingMore ? "Loading…" : "Load More"}
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-ink-faint">
                Showing {threads.length} of {pagination.totalItems}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function emptyTitle(search: string, category: DiscussionCategory | null): string {
  if (search.trim() !== "") {
    return "No discussions match your search.";
  }
  if (category !== null) {
    return `No discussions in ${CATEGORY_LABEL[category]} yet.`;
  }
  return "No discussions yet.";
}
