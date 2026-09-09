"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UpdateListItem } from "@/components/updates/update-list-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession } from "@/lib/auth/token-storage";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { UpdateFeedItemDto } from "../update-types";

type TypeFilter = "all" | "news" | "announcement";
type Status = "loading" | "ready" | "error";

const filterOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "announcement", label: "Announcement" },
];

export function UpdatesFeed() {
  const router = useRouter();
  const [items, setItems] = useState<UpdateFeedItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<Status>("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: UpdateFeedItemDto[]; pagination: PaginationMeta }>(
        `/api/v1/updates?type=${type}&page=1`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome === "failed" || result.outcome === "not-found") {
        setStatus("error");
        return;
      }
      setItems(result.body.data);
      setPagination(result.body.pagination);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [type, reloadKey, router]);

  function handleTypeChange(next: TypeFilter) {
    if (next === type) {
      return;
    }
    setStatus("loading");
    setType(next);
  }

  function handleRetry() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  async function handleLoadMore() {
    if (!pagination || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);

    const result = await authedFetch<{ data: UpdateFeedItemDto[]; pagination: PaginationMeta }>(
      `/api/v1/updates?type=${type}&page=${pagination.page + 1}`,
    );

    if (result.outcome === "unauthenticated") {
      clearSession();
      router.replace("/login");
      return;
    }
    if (result.outcome === "loaded") {
      setItems((current) => [...current, ...result.body.data]);
      setPagination(result.body.pagination);
    }
    setIsLoadingMore(false);
  }

  const hasMorePages = pagination !== null && pagination.page < pagination.totalPages;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
      <SegmentedControl
        options={filterOptions}
        value={type}
        onChange={handleTypeChange}
        ariaLabel="Filter updates by type"
      />

      <div className="mt-6 space-y-3">
        {status === "loading" ? (
          <div className="space-y-3" aria-label="Loading updates">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-edge bg-panel p-10 text-center">
            <p className="text-sm text-ink-muted">We could not load the updates. Please try again.</p>
            <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
              Try Again
            </Button>
          </div>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <EmptyState title="Nothing here yet" description="New updates will appear here." />
        ) : null}

        {status === "ready" && items.length > 0 ? (
          <>
            {items.map((update) => (
              <UpdateListItem key={update.id} update={update} showSnippet />
            ))}
            {hasMorePages ? (
              <Button
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="mx-auto mt-6 w-auto px-10"
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
