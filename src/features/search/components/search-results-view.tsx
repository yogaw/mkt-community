"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchResultItem } from "@/components/search/search-result-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { SearchResultItemDto } from "../search-types";

type Status = "loading" | "ready" | "error";

interface SearchResponse {
  data: SearchResultItemDto[];
  pagination: PaginationMeta;
}

const kindGroupOrder = ["video", "news", "announcement"] as const;

export function SearchResultsView({ query }: { query: string | undefined }) {
  const router = useRouter();
  const [items, setItems] = useState<SearchResultItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const trimmedQuery = query?.trim() ?? "";

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await authedFetch<SearchResponse>(
        `/api/v1/search?q=${encodeURIComponent(trimmedQuery)}&page=1`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome !== "loaded") {
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
  }, [trimmedQuery, reloadKey, router]);

  async function handleLoadMore() {
    if (!trimmedQuery || !pagination) {
      return;
    }
    setIsLoadingMore(true);

    const result = await authedFetch<SearchResponse>(
      `/api/v1/search?q=${encodeURIComponent(trimmedQuery)}&page=${pagination.page + 1}`,
    );
    if (result.outcome === "loaded") {
      setItems((current) => [...current, ...result.body.data]);
      setPagination(result.body.pagination);
    }
    setIsLoadingMore(false);
  }

  function handleRetry() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  if (!trimmedQuery) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
        <p className="text-sm text-ink-muted">Search for videos, news and announcements.</p>
      </main>
    );
  }

  const groupedItems = kindGroupOrder
    .map((kind) => ({ kind, results: items.filter((item) => item.kind === kind) }))
    .filter((group) => group.results.length > 0);

  const hasMore = pagination !== null && pagination.page < pagination.totalPages;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
      {status === "loading" ? (
        <div className="space-y-3" aria-label="Loading results">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not run this search. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" ? (
        items.length === 0 ? (
          <EmptyState
            title={`No results for ${trimmedQuery}`}
            description="Try a different keyword or check the spelling."
          />
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <section key={group.kind} aria-label={`${group.kind} results`}>
                <div className="space-y-3">
                  {group.results.map((item) => (
                    <SearchResultItem key={`${item.kind}-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            ))}

            {hasMore ? (
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading" : "Load More"}
              </Button>
            ) : null}
          </div>
        )
      ) : null}
    </main>
  );
}
