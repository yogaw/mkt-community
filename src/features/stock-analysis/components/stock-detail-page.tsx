"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getToken } from "@/lib/auth/token-storage";
import {
  brokerSummaryQuerySchema,
  type MarketBoard,
  type StockBrokerSummary,
  type StockOverview,
} from "@/features/stock-analysis/stock-analysis-types";
import {
  FUNDAMENTAL_PERIODS,
  type FundamentalPeriod,
  type StockFundamentals,
} from "@/features/stock-analysis/fundamentals-types";
import { presetForRange, rangeForPreset } from "@/features/stock-analysis/date-presets";
import { rememberRecent } from "@/features/stock-analysis/recently-viewed";
import { StockHeader } from "./stock-header";
import { BrokerAnalysisControls, type ControlState } from "./broker-analysis-controls";
import { BrokerSummaryCards } from "./broker-summary-cards";
import { FlowInsightCard } from "./flow-insight-card";
import { BrokerCumulativeChart } from "./broker-cumulative-chart";
import { BrokerRanking } from "./broker-ranking";
import { DailyBrokerFlowChart } from "./daily-broker-flow-chart";
import { PriceVsFlow } from "./price-vs-flow";
import { BrokerTable } from "./broker-table";
import { BrokerDetailDrawer } from "./broker-detail-drawer";
import { StockProfile } from "./stock-profile";
import { FundamentalsView } from "./fundamentals-view";
import { DataSourceBadge } from "./data-source-badge";
import { ErrorState, KpiSkeleton, LoadingState } from "./states";

const TABS = [
  { key: "broker", label: "Broker Summary" },
  { key: "profile", label: "Stock Profile" },
  { key: "fundamental", label: "Fundamentals" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function StockDetailPage({ ticker }: { ticker: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = readTab(params.get("tab"));

  const [overview, setOverview] = useState<StockOverview | null>(null);
  const [overviewFailed, setOverviewFailed] = useState<"error" | "not-found" | null>(null);

  const [coverage, setCoverage] = useState<{ earliest: string; latest: string } | null>(null);
  const [applied, setApplied] = useState<ControlState | null>(null);
  const [draft, setDraft] = useState<ControlState | null>(null);

  /*
   * The request is identified by what it asks for, and the answer carries that
   * identity back. Loading is then read off the pair rather than set by an
   * effect — and the previously loaded summary stays on screen throughout, so
   * an Analyze dims the dashboard instead of blanking it.
   */
  const request = applied
    ? `${applied.startDate}|${applied.endDate}|${applied.topBrokers}|${applied.market}`
    : null;
  const [loadedSummary, setLoadedSummary] = useState<
    { request: string; summary: StockBrokerSummary } | null
  >(null);
  const [failedSummaryRequest, setFailedSummaryRequest] = useState<string | null>(null);

  const summary = loadedSummary?.summary ?? null;
  const isSummaryLoading =
    request !== null && loadedSummary?.request !== request && failedSummaryRequest !== request;
  const summaryFailed = request !== null && failedSummaryRequest === request;

  const [period, setPeriod] = useState<FundamentalPeriod>("TTM");
  const [loadedFundamentals, setLoadedFundamentals] = useState<{
    period: FundamentalPeriod;
    data: StockFundamentals | null;
  } | null>(null);

  const hasLoadedFundamentals = loadedFundamentals?.period === period;
  const fundamentals = hasLoadedFundamentals ? loadedFundamentals.data : null;

  const [openBroker, setOpenBroker] = useState<string | null>(null);
  const [isWatchlistBusy, setIsWatchlistBusy] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [reloadKey, setReloadKey] = useState(0);

  const goToLogin = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    rememberRecent(ticker);
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: StockOverview }>(
        `/api/v1/stocks/${ticker}/overview`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome === "not-found") {
        setOverviewFailed("not-found");
        return;
      }
      if (result.outcome !== "loaded") {
        setOverviewFailed("error");
        return;
      }
      setOverview(result.body.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker, reloadKey, goToLogin]);

  // The default window is one month back from the freshest session the
  // ingestion holds, not from today — anchoring to "now" produces an empty
  // chart over a weekend.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{
        coverage: { earliest: string; latest: string } | null;
      }>("/api/v1/stocks/search?limit=1");
      if (cancelled || result.outcome !== "loaded" || !result.body.coverage) {
        return;
      }
      const window = result.body.coverage;
      const range = rangeForPreset("1M", window.latest, window.earliest);
      const state: ControlState = { ...range, topBrokers: 8, market: "ALL" };

      setCoverage(window);
      setApplied(state);
      setDraft(state);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!applied || !request) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams({
        startDate: applied.startDate,
        endDate: applied.endDate,
        topBrokers: String(applied.topBrokers),
        market: applied.market,
      });
      const result = await authedFetch<{ data: StockBrokerSummary }>(
        `/api/v1/stocks/${ticker}/broker-summary?${query.toString()}`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome !== "loaded") {
        setFailedSummaryRequest(request);
        return;
      }
      setLoadedSummary({ request, summary: result.body.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker, applied, request, goToLogin]);

  useEffect(() => {
    if (tab !== "fundamental") {
      return;
    }
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: StockFundamentals | null }>(
        `/api/v1/stocks/${ticker}/fundamentals?period=${period}`,
      );
      if (cancelled) {
        return;
      }
      // A provider that is not connected answers with null, which is a valid
      // outcome and not a failure — the tab renders its empty state.
      setLoadedFundamentals({
        period,
        data: result.outcome === "loaded" ? result.body.data : null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker, tab, period]);

  function setTab(next: TabKey) {
    const query = new URLSearchParams(params.toString());
    if (next === "broker") {
      query.delete("tab");
    } else {
      query.set("tab", next);
    }
    const text = query.toString();
    router.replace(text ? `/stock-analysis/${ticker}?${text}` : `/stock-analysis/${ticker}`, {
      scroll: false,
    });
  }

  async function toggleWatchlist() {
    if (!overview?.watchlist.signalId) {
      return;
    }
    const token = getToken();
    if (!token) {
      goToLogin();
      return;
    }

    setIsWatchlistBusy(true);
    const next = !overview.watchlist.watchlisted;
    // The existing Signals endpoint — Stock Analysis adds no watchlist of its own.
    const response = await fetch(
      `/api/v1/signals/${overview.watchlist.signalId}/watchlist`,
      { method: next ? "PUT" : "DELETE", headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => null);
    setIsWatchlistBusy(false);

    if (response?.ok) {
      setOverview({ ...overview, watchlist: { ...overview.watchlist, watchlisted: next } });
    }
  }

  if (overviewFailed) {
    return (
      <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
        <BackLink />
        <div className="mt-4">
          <ErrorState
            title={
              overviewFailed === "not-found"
                ? `No market data for ${ticker}.`
                : "We could not load this stock."
            }
            description={
              overviewFailed === "not-found"
                ? "The ticker may be wrong, or the ingestion may not cover this listing."
                : "The request did not come back. Nothing has been lost — try again."
            }
            onRetry={
              overviewFailed === "error" ? () => setReloadKey((key) => key + 1) : undefined
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
      <BackLink />

      <div className="mt-4">
        {overview ? (
          <StockHeader
            overview={overview}
            isWatchlistBusy={isWatchlistBusy}
            shareLabel={shareLabel}
            onToggleWatchlist={() => void toggleWatchlist()}
            onShare={() => {
              void (async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setShareLabel("Link copied");
                } catch {
                  setShareLabel("Copy failed");
                }
                setTimeout(() => setShareLabel("Share"), 2000);
              })();
            }}
          />
        ) : (
          <LoadingState label="Loading stock" className="h-56 rounded-xl" />
        )}
      </div>

      <nav aria-label="Stock analysis sections" className="mt-5 border-b border-edge">
        <ul className="flex gap-1 overflow-x-auto">
          {TABS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                aria-current={tab === item.key ? "page" : undefined}
                onClick={() => setTab(item.key)}
                className={cn(
                  "block shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                  tab === item.key
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "broker" ? (
        <div className="mt-5 space-y-4">
          {draft && applied ? (
            <BrokerAnalysisControls
              ticker={ticker}
              draft={draft}
              applied={applied}
              preset={
                coverage
                  ? presetForRange(draft.startDate, draft.endDate, coverage.latest, coverage.earliest)
                  : "CUSTOM"
              }
              coverage={coverage}
              isLoading={isSummaryLoading}
              onDraftChange={setDraft}
              onPreset={(preset) => {
                if (!coverage || preset === "CUSTOM") {
                  return;
                }
                const range = rangeForPreset(preset, coverage.latest, coverage.earliest);
                const next = { ...draft, ...range };
                setDraft(next);
                setApplied(next);
              }}
              onAnalyze={() => setApplied(draft)}
            />
          ) : (
            <LoadingState label="Loading controls" className="h-32 rounded-xl" />
          )}

          {summaryFailed ? (
            <ErrorState
              title="Broker data is unavailable."
              description="The broker-flow request did not come back. The date range may be too wide, or the data provider may be down."
              onRetry={() => setFailedSummaryRequest(null)}
            />
          ) : null}

          {/* An Analyze keeps the previous period on screen and dims it, rather
              than blanking a dashboard the reader is still using. */}
          {summary ? (
            <div
              className={cn(
                "space-y-4 transition-opacity",
                isSummaryLoading && "pointer-events-none opacity-60",
              )}
            >
              <DataSourceBadge
                source={summary.source}
                startDate={summary.startDate}
                endDate={summary.endDate}
                lastUpdated={summary.lastUpdated}
              />
              <BrokerSummaryCards summary={summary} />
              <FlowInsightCard summary={summary} />
              <BrokerCumulativeChart
                brokers={summary.brokers.filter((broker) =>
                  summary.chartBrokers.includes(broker.brokerCode),
                )}
                onSelectBroker={setOpenBroker}
              />
              {/* Side by side: the ranking says who moved the period and the
                  daily bars say when, and reading them together is the point. */}
              <div className="grid gap-4 xl:grid-cols-2">
                <BrokerRanking brokers={summary.brokers} onSelectBroker={setOpenBroker} />
                <DailyBrokerFlowChart daily={summary.daily} />
              </div>
              <PriceVsFlow daily={summary.daily} netValue={summary.netValue} />
              <BrokerTable brokers={summary.brokers} onSelectBroker={setOpenBroker} />
            </div>
          ) : isSummaryLoading || !applied ? (
            <div className="space-y-4">
              <KpiSkeleton />
              <LoadingState label="Loading broker chart" className="h-80 rounded-xl" />
              <LoadingState label="Loading broker ranking" className="h-64 rounded-xl" />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "profile" && overview ? (
        <div className="mt-5">
          <StockProfile profile={overview.profile} />
        </div>
      ) : null}

      {tab === "fundamental" ? (
        <div className="mt-5">
          {hasLoadedFundamentals ? (
            <FundamentalsView
              fundamentals={fundamentals}
              period={period}
              onPeriodChange={setPeriod}
            />
          ) : (
            <div className="space-y-4">
              <KpiSkeleton />
              <LoadingState label="Loading financial statements" className="h-72 rounded-xl" />
            </div>
          )}
        </div>
      ) : null}

      <BrokerDetailDrawer
        ticker={ticker}
        broker={summary?.brokers.find((item) => item.brokerCode === openBroker) ?? null}
        onClose={() => setOpenBroker(null)}
      />
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/stock-analysis"
      className="inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
    >
      &larr; All stocks
    </Link>
  );
}

function readTab(value: string | null): TabKey {
  return TABS.some((tab) => tab.key === value) ? (value as TabKey) : "broker";
}

/** Re-exported so the period list has one definition. */
export { FUNDAMENTAL_PERIODS, brokerSummaryQuerySchema };
export type { MarketBoard };
