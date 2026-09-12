"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import type { StockSearchResult } from "@/features/stock-analysis/stock-analysis-types";
import { readRecent } from "@/features/stock-analysis/recently-viewed";
import { StockResultList, StockSearch } from "./stock-search";
import { ErrorState } from "./states";

const SEARCH_DEBOUNCE_MS = 300;

interface SearchBody {
  data: StockSearchResult[];
  coverage: { earliest: string; latest: string } | null;
}

/**
 * Stock discovery.
 *
 * The search term lives in the URL, so a search is a link somebody can send and
 * the back button steps through searches rather than out of the page.
 */
export function StockAnalysisPage() {
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("q") ?? "";

  const [draft, setDraft] = useState(search);
  const [recent, setRecent] = useState<StockSearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<StockSearchResult[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Identity in, identity out — so "loading" is something to read rather than
  // a flag an effect has to set going in and clear on every way out.
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
      const result = await authedFetch<SearchBody>(url);

      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return null;
      }
      if (result.outcome !== "loaded") {
        return null;
      }
      return result.body.data;
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.trim() !== search) {
        const next = draft.trim();
        router.replace(next ? `/stock-analysis?q=${encodeURIComponent(next)}` : "/stock-analysis", {
          scroll: false,
        });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, search, router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await load(search);
      if (cancelled) {
        return;
      }
      if (data === null) {
        setFailedRequest(request);
        return;
      }
      setLoaded({ request, rows: data });
    })();

    return () => {
      cancelled = true;
    };
  }, [search, request, load]);

  // Recently viewed is a local list of tickers; the prices come from the same
  // endpoint so the rows look identical to every other list on the page.
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
      const matched = tickers
        .map((ticker, index) => rows[index]?.find((row) => row.ticker === ticker) ?? null)
        .filter((row): row is StockSearchResult => row !== null);
      setRecent(matched);
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  // The member's existing signal watchlist, read through to its tickers.
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

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Stock Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Understand broker flow, ownership activity, company profile, and fundamentals for
          Indonesian stocks.
        </p>
      </header>

      <div className="mt-5 max-w-xl">
        <StockSearch value={draft} onChange={setDraft} />
        <p className="mt-2 text-xs text-ink-faint">
          Try BBCA, BMRI, ADRO, CUAN or PTRO — search by ticker or company name.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {hasFailed ? (
          <ErrorState
            title="We could not load stocks."
            description="The request did not come back. Nothing has been lost — try again."
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : (
          <StockResultList
            title={search ? "Search Results" : "Most Active"}
            description={
              search
                ? `Matching “${search}”`
                : "By value traded on the most recent session."
            }
            stocks={results ?? []}
            isLoading={results === null}
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
            emptyTitle="Nothing viewed yet."
            emptyDescription="Open a stock to start building this list."
          />
        ) : null}
      </div>
    </main>
  );
}
