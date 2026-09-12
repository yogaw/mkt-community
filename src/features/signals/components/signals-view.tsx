"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getToken, isStoredUserAdmin } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import type { PaginationMeta } from "@/lib/api/pagination";
import { SignalStatCards } from "./signal-stat-cards";
import { SignalTable } from "./signal-table";
import { SignalDetailPanel, SignalDetailPanelSkeleton } from "./signal-detail-panel";
import { SignalPerformancePanel } from "./signal-performance-panel";
import { AddSignalModal } from "./add-signal-modal";
import type {
  SignalDetailDto,
  SignalPerformanceDto,
  SignalRowDto,
  SignalSort,
  SignalStatsDto,
  SignalStatus,
  SignalType,
} from "@/features/signals/signal-types";

const SEARCH_DEBOUNCE_MS = 300;

type ViewTab = "active" | "watchlist" | "history" | "performance";
type Status = "loading" | "ready" | "error";

interface ListBody {
  data: SignalRowDto[];
  pagination: PaginationMeta;
  stats: SignalStatsDto;
}

const typeOptions: Array<{ value: SignalType | "all"; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "SWING", label: "Swing" },
  { value: "TRADING", label: "Trading" },
  { value: "POSITION", label: "Position" },
];

const statusOptions: Array<{ value: SignalStatus | "all"; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "TP1_HIT", label: "TP1 Hit" },
  { value: "TP2_HIT", label: "TP2 Hit" },
  { value: "STOP_LOSS", label: "Stop Loss" },
  { value: "CLOSED", label: "Closed" },
];

const sortOptions: Array<{ value: SignalSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "return-desc", label: "Return: High to Low" },
  { value: "return-asc", label: "Return: Low to High" },
  { value: "ticker", label: "Ticker A–Z" },
];

/** The stored session cannot change role without a fresh sign-in, so there is
 *  nothing to subscribe to for the life of this page. */
function subscribeToSession(): () => void {
  return () => {};
}

const selectClass =
  "rounded-lg border border-edge bg-panel-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

export function SignalsView() {
  const router = useRouter();

  const [tab, setTab] = useState<ViewTab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SignalType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "all">("all");
  const [sort, setSort] = useState<SignalSort>("newest");

  const [signals, setSignals] = useState<SignalRowDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<SignalStatsDto | null>(null);
  const [listStatus, setListStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SignalDetailDto | null>(null);
  const [failedDetailId, setFailedDetailId] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const [performance, setPerformance] = useState<SignalPerformanceDto | null>(null);
  const [hasPerformanceError, setHasPerformanceError] = useState(false);

  const [pendingWatchlistId, setPendingWatchlistId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const debouncedRef = useRef("");

  // localStorage has no server snapshot, so the admin control resolves to false
  // during render and appears once hydrated. Gating the UI is a convenience —
  // POST /api/v1/signals re-checks the role on the signed token.
  const isAdmin = useSyncExternalStore(subscribeToSession, isStoredUserAdmin, () => false);

  const goToLogin = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== debouncedRef.current) {
        debouncedRef.current = search;
        setDebouncedSearch(search);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const listTab: Exclude<ViewTab, "performance"> = tab === "performance" ? "active" : tab;

  // The stat cards sit above every tab, so the list query runs even while the
  // performance tab is showing; it is the only source of those counts.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams({ tab: listTab, sort });
      if (debouncedSearch) {
        query.set("search", debouncedSearch);
      }
      if (typeFilter !== "all") {
        query.set("type", typeFilter);
      }
      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      const result = await authedFetch<ListBody>(`/api/v1/signals?${query.toString()}`);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome !== "loaded") {
        setListStatus("error");
        return;
      }

      setSignals(result.body.data);
      setPagination(result.body.pagination);
      setStats(result.body.stats);
      setListStatus("ready");
      setSelectedId((current) => {
        const stillVisible = result.body.data.some((signal) => signal.id === current);
        return stillVisible ? current : (result.body.data[0]?.id ?? null);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [listTab, debouncedSearch, typeFilter, statusFilter, sort, reloadKey, goToLogin]);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: SignalDetailDto }>(`/api/v1/signals/${selectedId}`);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome !== "loaded") {
        setFailedDetailId(selectedId);
        return;
      }
      setDetail(result.body.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, detailReloadKey, goToLogin]);

  useEffect(() => {
    if (tab !== "performance") {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: SignalPerformanceDto }>(
        "/api/v1/signals/performance",
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome !== "loaded") {
        setHasPerformanceError(true);
        return;
      }
      setPerformance(result.body.data);
      setHasPerformanceError(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey, goToLogin]);

  async function handleToggleWatchlist(signal: { id: string; isWatchlisted: boolean }) {
    const token = getToken();
    if (!token) {
      goToLogin();
      return;
    }

    const nextWatchlisted = !signal.isWatchlisted;
    setPendingWatchlistId(signal.id);

    try {
      const response = await fetch(`/api/v1/signals/${signal.id}/watchlist`, {
        method: nextWatchlisted ? "PUT" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        goToLogin();
        return;
      }
      if (!response.ok) {
        return;
      }

      setSignals((current) =>
        current.map((row) =>
          row.id === signal.id ? { ...row, isWatchlisted: nextWatchlisted } : row,
        ),
      );
      setDetail((current) =>
        current && current.id === signal.id
          ? { ...current, isWatchlisted: nextWatchlisted }
          : current,
      );
      setStats((current) =>
        current
          ? {
              ...current,
              watchlistCount: current.watchlistCount + (nextWatchlisted ? 1 : -1),
            }
          : current,
      );

      // The watchlist tab lists exactly these rows, so it has to be refetched.
      if (tab === "watchlist") {
        setReloadKey((key) => key + 1);
      }
    } finally {
      setPendingWatchlistId(null);
    }
  }

  function handleCreated(signal: SignalDetailDto) {
    // Land on the new signal: it is published as active, so switch there,
    // clear filters that might hide it, and refetch for the new counts.
    setTab("active");
    setSearch("");
    debouncedRef.current = "";
    setDebouncedSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSort("newest");
    setDetail(signal);
    setSelectedId(signal.id);
    setReloadKey((key) => key + 1);
  }

  function handleTabChange(next: ViewTab) {
    if (next === tab) {
      return;
    }
    setTab(next);
    if (next !== "performance") {
      setListStatus("loading");
    }
  }

  function handleRetry() {
    setListStatus("loading");
    setHasPerformanceError(false);
    setReloadKey((key) => key + 1);
  }

  function handleRetryDetail() {
    setFailedDetailId(null);
    setDetailReloadKey((key) => key + 1);
  }

  function handleClearFilters() {
    setSearch("");
    debouncedRef.current = "";
    setDebouncedSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSort("newest");
  }

  // Derived from which row is selected, so switching rows shows the skeleton on the
  // same render rather than needing an effect to push a "loading" state first.
  const shownDetail = detail !== null && detail.id === selectedId ? detail : null;
  const hasDetailError = selectedId !== null && failedDetailId === selectedId;
  const isDetailLoading = selectedId !== null && shownDetail === null && !hasDetailError;
  const isPerformanceLoading =
    tab === "performance" && performance === null && !hasPerformanceError;

  const tabs: Array<{ value: ViewTab; label: string; count?: number }> = [
    { value: "active", label: "Active Signals", count: stats?.activeCount },
    { value: "watchlist", label: "Watchlist", count: stats?.watchlistCount },
    { value: "history", label: "Signal History" },
    { value: "performance", label: "Performance" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Actionable trade ideas backed by our analysis, with the entry, targets and stop for
          each one laid out before you commit.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="rounded-lg border border-edge bg-panel px-4 py-2.5 text-sm text-ink-muted">
            <span className="text-ink">&ldquo;Discipline turns good trades into great results.&rdquo;</span>{" "}
            <span className="text-ink-faint">— Piranha</span>
          </p>
          {isAdmin ? (
            <div className="shrink-0">
              <Button onClick={() => setIsAddOpen(true)} className="px-4">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add Signal
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <AddSignalModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      <div className="mt-6">
        {stats === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <SignalStatCards stats={stats} />
        )}
      </div>

      <div className="mt-8 border-b border-edge">
        <div role="tablist" aria-label="Signal views" className="flex gap-1 overflow-x-auto">
          {tabs.map((item) => {
            const isActive = item.value === tab;
            return (
              <button
                key={item.value}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => handleTabChange(item.value)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
                {item.count === undefined ? "" : ` (${item.count})`}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "performance" ? (
        <div className="mt-6">
          {isPerformanceLoading ? <Skeleton className="h-72 rounded-xl" /> : null}
          {hasPerformanceError ? <RetryBlock onRetry={handleRetry} /> : null}
          {performance && !hasPerformanceError ? (
            <SignalPerformancePanel performance={performance} />
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="lg:max-w-sm lg:flex-1">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stocks or filter signals..."
                aria-label="Search signals"
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as SignalType | "all")}
                aria-label="Filter by type"
                className={selectClass}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as SignalStatus | "all")}
                aria-label="Filter by status"
                className={selectClass}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SignalSort)}
                aria-label="Sort signals"
                className={selectClass}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            {listStatus === "loading" ? <Skeleton className="h-80 rounded-xl" /> : null}
            {listStatus === "error" ? <RetryBlock onRetry={handleRetry} /> : null}

            {listStatus === "ready" && signals.length === 0 ? (
              <EmptyState
                title={tab === "watchlist" ? "Your watchlist is empty" : "No signals found"}
                description={
                  tab === "watchlist"
                    ? "Star a signal from the Active Signals tab and it will show up here."
                    : "Try a different search term, type or status."
                }
                action={
                  tab === "watchlist" ? (
                    <Button onClick={() => handleTabChange("active")} className="w-auto px-6">
                      Browse Active Signals
                    </Button>
                  ) : (
                    <Button onClick={handleClearFilters} className="w-auto px-6">
                      Clear Filters
                    </Button>
                  )
                }
              />
            ) : null}

            {listStatus === "ready" && signals.length > 0 ? (
              <>
                <SignalTable
                  signals={signals}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onToggleWatchlist={(signal) => void handleToggleWatchlist(signal)}
                  pendingWatchlistId={pendingWatchlistId}
                />
                {pagination && pagination.totalItems > signals.length ? (
                  <p className="mt-3 text-xs text-ink-faint">
                    Showing {signals.length} of {pagination.totalItems} signals.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          {listStatus === "ready" && signals.length > 0 ? (
            <div className="mt-6">
              {isDetailLoading ? <SignalDetailPanelSkeleton /> : null}
              {hasDetailError ? <RetryBlock onRetry={handleRetryDetail} /> : null}
              {shownDetail ? (
                <SignalDetailPanel
                  signal={shownDetail}
                  isTogglePending={pendingWatchlistId === shownDetail.id}
                  onToggleWatchlist={() => void handleToggleWatchlist(shownDetail)}
                />
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

function RetryBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-10 text-center">
      <p className="text-sm text-ink-muted">We could not load the signals. Please try again.</p>
      <Button onClick={onRetry} className="mx-auto mt-4 w-auto px-6">
        Try Again
      </Button>
    </div>
  );
}
