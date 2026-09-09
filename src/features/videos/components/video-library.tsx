"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession, getToken } from "@/lib/auth/token-storage";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { CategoryDto, VideoCardDto } from "../video-types";

const SEARCH_DEBOUNCE_MS = 300;
const gridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

type Status = "loading" | "ready" | "error";

type ListResult =
  | { outcome: "unauthenticated" }
  | { outcome: "failed" }
  | { outcome: "loaded"; videos: VideoCardDto[]; pagination: PaginationMeta };

interface ListParams {
  search: string;
  categoryId: string | null;
  page: number;
}

async function fetchVideosPage(params: ListParams): Promise<ListResult> {
  const token = getToken();
  if (!token) {
    return { outcome: "unauthenticated" };
  }

  const query = new URLSearchParams({ page: String(params.page) });
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.categoryId) {
    query.set("categoryId", params.categoryId);
  }

  try {
    const response = await fetch(`/api/v1/videos?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      return { outcome: "unauthenticated" };
    }
    if (!response.ok) {
      return { outcome: "failed" };
    }

    const body = (await response.json()) as { data: VideoCardDto[]; pagination: PaginationMeta };
    return { outcome: "loaded", videos: body.data, pagination: body.pagination };
  } catch {
    return { outcome: "failed" };
  }
}

export function VideoLibrary() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [videos, setVideos] = useState<VideoCardDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = getToken();
      if (!token) {
        clearSession();
        router.replace("/login");
        return;
      }
      try {
        const response = await fetch("/api/v1/categories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { data: CategoryDto[] };
        if (!cancelled) {
          setCategories(body.data);
        }
      } catch {
        // chips stay empty; the list below has its own error state with retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== debouncedRef.current) {
        debouncedRef.current = search;
        setIsRefreshing(true);
        setDebouncedSearch(search);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchVideosPage({
        search: debouncedSearch,
        categoryId: activeCategoryId,
        page: 1,
      });
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome === "failed") {
        setStatus("error");
        setIsRefreshing(false);
        return;
      }
      setVideos(result.videos);
      setPagination(result.pagination);
      setStatus("ready");
      setIsRefreshing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, activeCategoryId, reloadKey, router]);

  function handleCategorySelect(categoryId: string | null) {
    if (categoryId === activeCategoryId) {
      return;
    }
    setIsRefreshing(true);
    setActiveCategoryId(categoryId);
  }

  function handleClearFilters() {
    if (activeCategoryId === null && debouncedSearch === "" && search === "") {
      return;
    }
    setIsRefreshing(true);
    setSearch("");
    debouncedRef.current = "";
    setDebouncedSearch("");
    setActiveCategoryId(null);
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

    const result = await fetchVideosPage({
      search: debouncedSearch,
      categoryId: activeCategoryId,
      page: pagination.page + 1,
    });

    if (result.outcome === "unauthenticated") {
      clearSession();
      router.replace("/login");
      return;
    }
    if (result.outcome === "loaded") {
      setVideos((current) => [...current, ...result.videos]);
      setPagination(result.pagination);
    }
    setIsLoadingMore(false);
  }

  const hasMorePages = pagination !== null && pagination.page < pagination.totalPages;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search videos..."
          aria-label="Search videos"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          <Chip active={activeCategoryId === null} onClick={() => handleCategorySelect(null)}>
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={activeCategoryId === category.id}
              onClick={() => handleCategorySelect(category.id)}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {status === "loading" ? (
          <div className={gridClass} aria-label="Loading videos">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-edge bg-panel p-10 text-center">
            <p className="text-sm text-ink-muted">We could not load the videos. Please try again.</p>
            <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
              Try Again
            </Button>
          </div>
        ) : null}

        {status === "ready" && videos.length === 0 ? (
          <EmptyState
            title="No videos found"
            description="Try a different search term or category."
            action={
              <Button onClick={handleClearFilters} className="w-auto px-6">
                Clear Filters
              </Button>
            }
          />
        ) : null}

        {status === "ready" && videos.length > 0 ? (
          <>
            <div className={isRefreshing ? `${gridClass} pointer-events-none opacity-50` : gridClass}>
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            {hasMorePages ? (
              <Button
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="mx-auto mt-8 w-auto px-10"
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
