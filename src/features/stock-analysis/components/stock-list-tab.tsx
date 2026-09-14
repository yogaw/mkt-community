"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import type { StockSearchResult } from "@/features/stock-analysis/stock-analysis-types";
import { readRecent } from "@/features/stock-analysis/recently-viewed";
import { StockResultList, StockSearch } from "./stock-search";
import { ErrorState } from "./states";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Browsing, as a tab inside the workspace rather than a page in front of it.
 *
 * The reference puts the stock list beside the analysis for the same reason: a
 * member comparing two stocks should not have to leave the analysis to find the
 * second one.
 */
export function StockListTab({
  onSelect,
  router,
}: {
  onSelect: (ticker: string) => void;
  router: { replace: (href: string) => void };
}) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<StockSearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<StockSearchResult[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const request = `${search}|${reloadKey}`;
  const [loaded, setLoaded] = useState<{ request: string; rows: StockSearchResult[] } | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);

  const results = loaded?.request === request ? loaded.rows : null;
  const hasFailed = failedRequest === request;

  const load = useCallback(
    async (query: string, list?: "watchlist"): Promise<StockSearchResult[] | null> => {
      const url = query
        ? `/api/v1/stocks/search?q=${encodeURIComponent(query)}`
        : `/api/v1/stocks/search${list ? `?list=${list}` : ""}`;
      const result = await authedFetch<{ data: StockSearchResult[] }>(url);

      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return null;
      }
      return result.outcome === "loaded" ? result.body.data : null;
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const rows = await load(search);
      if (cancelled) {
        return;
      }
      if (rows === null) {
        setFailedRequest(request);
        return;
      }
      setLoaded({ request, rows });
    })();

    return () => {
      cancelled = true;
    };
  }, [search, request, load]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const rows = await load("", "watchlist");
      if (!cancelled && rows) {
        setWatchlist(rows);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const tickers = readRecent();
    if (tickers.length === 0) {
      return;
    }

    void (async () => {
      const rows = await Promise.all(tickers.map((ticker) => load(ticker)));
      if (cancelled) {
        return;
      }
      setRecent(
        tickers
          .map((ticker, index) => rows[index]?.find((row) => row.ticker === ticker) ?? null)
          .filter((row): row is StockSearchResult => row !== null),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="max-w-xl">
        <StockSearch value={draft} onChange={setDraft} />
        <p className="mt-2 text-xs text-ink-faint">
          Try BBCA, BMRI, ADRO, CUAN or PTRO — search by ticker or company name.
        </p>
      </div>

      {hasFailed ? (
        <ErrorState
          title="We could not load stocks."
          description="The request did not come back. Nothing has been lost — try again."
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <StockResultList
          title={search ? "Search Results" : "Most Active"}
          description={search ? `Matching “${search}”` : "By value traded on the most recent session."}
          stocks={results ?? []}
          isLoading={results === null}
          onSelect={onSelect}
          emptyTitle={search ? "No stocks match that search." : "No stocks available."}
          emptyDescription={
            search
              ? "Check the ticker, or search by company name instead."
              : "The market-data ingestion has not loaded a session yet."
          }
        />
      )}

      {watchlist.length > 0 && !search ? (
        <StockResultList
          title="My Watchlist"
          description="Stocks behind the signals you follow."
          stocks={watchlist}
          isLoading={false}
          onSelect={onSelect}
          emptyTitle="Your watchlist is empty."
          emptyDescription="Add a signal to your watchlist to see it here."
        />
      ) : null}

      {recent.length > 0 && !search ? (
        <StockResultList
          title="Recently Viewed"
          description="On this device."
          stocks={recent}
          isLoading={false}
          onSelect={onSelect}
          emptyTitle="Nothing viewed yet."
          emptyDescription="Open a stock to start building this list."
        />
      ) : null}
    </div>
  );
}
