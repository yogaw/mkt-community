"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import type { StockSearchResult } from "@/features/stock-analysis/stock-analysis-types";
import { readRecent } from "@/features/stock-analysis/recently-viewed";
import { ErrorState, LoadingState } from "./states";

/**
 * /stock-analysis lands on a stock rather than on a chooser.
 *
 * The workspace is the product: an empty one with nothing selected would be a
 * page whose only purpose is to send you to another page. So this picks up
 * where the member left off — the last stock they looked at on this device —
 * and falls back to the most actively traded name, then replaces the URL so the
 * address bar shows the stock they are actually reading.
 *
 * Browsing has not gone anywhere; it is the Stock List tab inside the
 * workspace.
 */
export function StockAnalysisEntry() {
  const router = useRouter();
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const recent = readRecent()[0];
      if (recent) {
        router.replace(`/stock-analysis/${recent}`);
        return;
      }

      const result = await authedFetch<{ data: StockSearchResult[] }>(
        "/api/v1/stocks/search?limit=1",
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }

      const first = result.outcome === "loaded" ? result.body.data[0]?.ticker : undefined;
      if (!first) {
        setHasFailed(true);
        return;
      }
      router.replace(`/stock-analysis/${first}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

  if (hasFailed) {
    return (
      <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
        <ErrorState
          title="No stocks are available yet."
          description="The market-data ingestion has not loaded a session, so there is nothing to analyse. Try again once it has run."
          onRetry={() => {
            setHasFailed(false);
            setReloadKey((key) => key + 1);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Stock Analysis</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Understand broker flow, ownership activity, company profile, and fundamentals for
        Indonesian stocks.
      </p>
      <div className="mt-6 space-y-4">
        <LoadingState label="Opening the workspace" className="h-56 rounded-xl" />
        <LoadingState label="Loading controls" className="h-32 rounded-xl" />
      </div>
    </main>
  );
}
