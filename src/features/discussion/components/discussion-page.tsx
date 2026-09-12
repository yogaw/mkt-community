"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import type { PaginationMeta } from "@/lib/api/pagination";
import { useIsAdmin } from "@/features/discussion/use-discussion-session";
import {
  DEFAULT_THREADS_PAGE_SIZE,
  DISCUSSION_CATEGORIES,
  THREAD_SORTS,
  type ContributorDto,
  type DiscussionCategory,
  type DiscussionOverviewDto,
  type ThreadSort,
  type ThreadSummaryDto,
} from "@/features/discussion/discussion-types";
import { DiscussionHeader } from "./discussion-header";
import { DiscussionCategoryGrid } from "./discussion-category-grid";
import { DiscussionFeed, type FeedStatus } from "./discussion-feed";
import { CommunityRulesCard } from "./community-rules-card";
import { TopContributorsCard, ContributorRow } from "./top-contributors-card";
import { CategoryGridSkeleton, SidebarSkeleton } from "./discussion-skeletons";
import { GuidelinesBody } from "./guidelines-body";

const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_OVERVIEW: DiscussionOverviewDto = {
  categories: DISCUSSION_CATEGORIES.map((category) => ({ category, threadCount: 0 })),
  contributors: [],
};

interface ListBody {
  data: ThreadSummaryDto[];
  pagination: PaginationMeta;
  overview: DiscussionOverviewDto;
}

export function DiscussionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const isAdmin = useIsAdmin();

  /*
   * Search, category and sort live in the URL. A filtered board is then a link
   * someone can send, the back button steps through filters rather than out of
   * the page, and a refresh lands on the same view.
   */
  const search = params.get("q") ?? "";
  const category = readCategory(params.get("category"));
  const sort = readSort(params.get("sort"));

  const [searchDraft, setSearchDraft] = useState(search);
  const [pageSize, setPageSize] = useState(DEFAULT_THREADS_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [allContributors, setAllContributors] = useState<ContributorDto[] | null>(null);

  const request = `${search}|${category ?? ""}|${sort}|${pageSize}|${reloadKey}`;
  const [loaded, setLoaded] = useState<{ request: string; body: ListBody } | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);

  const body = loaded?.request === request ? loaded.body : null;
  const isFirstLoad = loaded === null;
  const status: FeedStatus =
    body !== null ? "ready" : failedRequest === request ? "error" : "loading";
  // A "Load More" keeps the rows on screen while the longer page is fetched.
  const isLoadingMore = status === "loading" && !isFirstLoad;

  const threads = body?.data ?? (isLoadingMore ? (loaded?.body.data ?? []) : []);
  const overview = loaded?.body.overview ?? EMPTY_OVERVIEW;

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const query = next.toString();
      router.replace(query ? `/discussion?${query}` : "/discussion", { scroll: false });
    },
    [params, router],
  );

  // Debounced, and only the committed value reaches the URL — otherwise every
  // keystroke would become a history entry.
  const committedSearch = useRef(search);
  useEffect(() => {
    committedSearch.current = search;
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft.trim() !== committedSearch.current) {
        setPageSize(DEFAULT_THREADS_PAGE_SIZE);
        setParams({ q: searchDraft.trim() || null });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, setParams]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams({ sort, pageSize: String(pageSize) });
      if (category) {
        query.set("category", category);
      }
      if (search) {
        query.set("q", search);
      }

      const result = await authedFetch<ListBody>(`/api/v1/discussions?${query.toString()}`);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome !== "loaded") {
        setFailedRequest(request);
        return;
      }
      setLoaded({ request, body: result.body });
    })();

    return () => {
      cancelled = true;
    };
  }, [search, category, sort, pageSize, request, router]);

  async function openAllContributors() {
    const result = await authedFetch<{ data: ContributorDto[] }>(
      "/api/v1/discussions/contributors?limit=20",
    );
    setAllContributors(result.outcome === "loaded" ? result.body.data : overview.contributors);
  }

  function goToEditor() {
    router.push("/discussion/new");
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <DiscussionHeader
        search={searchDraft}
        onSearchChange={setSearchDraft}
        canCreate={isAdmin}
        onCreate={goToEditor}
      />

      <div className="mt-6">
        {isFirstLoad && status === "loading" ? (
          <CategoryGridSkeleton />
        ) : (
          <DiscussionCategoryGrid
            categories={overview.categories}
            selected={category}
            onSelect={(next) => {
              setPageSize(DEFAULT_THREADS_PAGE_SIZE);
              setParams({ category: next });
            }}
          />
        )}
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <DiscussionFeed
          status={status}
          threads={threads}
          pagination={body?.pagination ?? loaded?.body.pagination ?? null}
          category={category}
          search={search}
          sort={sort}
          canCreate={isAdmin}
          isLoadingMore={isLoadingMore}
          onSortChange={(next) => {
            setPageSize(DEFAULT_THREADS_PAGE_SIZE);
            setParams({ sort: next === "latest" ? null : next });
          }}
          onRetry={() => setReloadKey((key) => key + 1)}
          onLoadMore={() => setPageSize((size) => size + DEFAULT_THREADS_PAGE_SIZE)}
          onCreate={goToEditor}
        />

        <aside className="space-y-4">
          {isFirstLoad && status === "loading" ? (
            <SidebarSkeleton />
          ) : (
            <>
              <CommunityRulesCard onOpenGuidelines={() => setIsGuidelinesOpen(true)} />
              <TopContributorsCard
                contributors={overview.contributors}
                onViewAll={() => void openAllContributors()}
              />
            </>
          )}
        </aside>
      </div>

      <Modal
        open={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
        title="Community Guidelines"
        description="How this board works, and what is expected of everyone on it."
      >
        <div className="px-5 py-5">
          <GuidelinesBody />
        </div>
      </Modal>

      <Modal
        open={allContributors !== null}
        onClose={() => setAllContributors(null)}
        title="Top Contributors"
        description="Ranked by comments written."
      >
        <ol className="space-y-3 px-5 py-5">
          {(allContributors ?? []).map((contributor, index) => (
            <ContributorRow key={contributor.id} contributor={contributor} rank={index + 1} />
          ))}
          {allContributors?.length === 0 ? (
            <li className="text-sm text-ink-faint">Nobody has commented yet.</li>
          ) : null}
        </ol>
      </Modal>
    </main>
  );
}

function readCategory(value: string | null): DiscussionCategory | null {
  return DISCUSSION_CATEGORIES.includes(value as DiscussionCategory)
    ? (value as DiscussionCategory)
    : null;
}

function readSort(value: string | null): ThreadSort {
  return THREAD_SORTS.includes(value as ThreadSort) ? (value as ThreadSort) : "latest";
}
