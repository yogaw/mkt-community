"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import { formatTradingDate } from "@/features/market-overview/market-format";
import {
  GROUP_LABEL,
  INDICATOR_GROUPS,
  UNAVAILABLE_INDICATORS,
  type IndicatorCategory,
  type IndicatorGroup,
} from "@/features/market-data/indicator-catalogue";
import {
  changeTone,
  formatChange,
  formatIndicatorValue,
} from "@/features/market-data/market-data-format";
import type { MarketIndicatorDto } from "@/features/market-data/market-data-types";
import { IndicatorSparkline } from "./indicator-sparkline";

type Status = "loading" | "ready" | "error";

const CATEGORIES: Array<IndicatorCategory | "All"> = [
  "All",
  "Equity",
  "Rates",
  "Currency",
  "Commodities",
];

export function MarketDataView() {
  const router = useRouter();
  const [group, setGroup] = useState<IndicatorGroup>("GLOBAL");
  const [category, setCategory] = useState<IndicatorCategory | "All">("All");
  const [indicators, setIndicators] = useState<MarketIndicatorDto[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: MarketIndicatorDto[] }>(
        `/api/v1/market-data?group=${group}`,
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
      setIndicators(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [group, reloadKey, router]);

  const visible =
    category === "All" ? indicators : indicators.filter((item) => item.category === category);
  // Every series shares the same ingestion run, so one date describes the page.
  const asOf = indicators[0]?.latestDate ?? null;

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-muted">
          Global and local market indicators, all in one place.
        </p>
        {asOf ? (
          <p className="text-xs text-ink-faint">
            End of day · {formatTradingDate(asOf)}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {INDICATOR_GROUPS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={group === value}
            onClick={() => {
              if (group !== value) {
                setStatus("loading");
                setCategory("All");
                setGroup(value);
              }
            }}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
              group === value
                ? "border-accent bg-accent text-accent-ink"
                : "border-edge bg-panel text-ink-muted hover:text-ink",
            )}
          >
            {GROUP_LABEL[value]}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-6 rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load market data.</p>
          <Button
            onClick={() => {
              setStatus("loading");
              setReloadKey((key) => key + 1);
            }}
            className="mx-auto mt-4 w-auto px-6"
          >
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && indicators.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No indicators ingested yet"
            description="Run npm run fetch:market-indicators to populate this section."
          />
        </div>
      ) : null}

      {status === "ready" && indicators.length > 0 ? (
        <>
          {/* Headline strip: the first five of the group, at a glance. */}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {indicators.slice(0, 5).map((indicator) => (
              <li key={indicator.code} className="rounded-xl border border-edge bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{indicator.label}</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
                      {formatIndicatorValue(indicator.latest, indicator.unit, indicator.decimals)}
                    </p>
                  </div>
                  <div className="w-20 shrink-0">
                    <IndicatorSparkline
                      values={indicator.spark}
                      rising={(indicator.monthChangePercent ?? 0) >= 0}
                    />
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm font-semibold",
                    changeTone(indicator.dailyChangePercent, indicator.invertTone),
                  )}
                >
                  {formatChange(indicator.dailyChangePercent)}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-faint">{indicator.description}</p>
              </li>
            ))}
          </ul>

          <section className="mt-6 rounded-xl border border-edge bg-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Key Indicators</h2>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={category === value}
                    onClick={() => setCategory(value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      category === value
                        ? "bg-accent text-accent-ink"
                        : "bg-panel-raised text-ink-muted hover:text-ink",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-edge">
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Indicator</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Latest</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Daily</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">1M</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Trend (3M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {visible.map((indicator) => (
                    <tr key={indicator.code} className="transition-colors hover:bg-panel-raised/50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-ink">{indicator.label}</p>
                        <p className="text-xs text-ink-faint">{indicator.description}</p>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold whitespace-nowrap text-ink">
                        {formatIndicatorValue(indicator.latest, indicator.unit, indicator.decimals)}
                      </td>
                      <td className={cn("px-5 py-3 text-right text-sm font-semibold whitespace-nowrap", changeTone(indicator.dailyChangePercent, indicator.invertTone))}>
                        {formatChange(indicator.dailyChangePercent)}
                      </td>
                      <td className={cn("px-5 py-3 text-right text-sm font-semibold whitespace-nowrap", changeTone(indicator.monthChangePercent, indicator.invertTone))}>
                        {formatChange(indicator.monthChangePercent)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="ml-auto w-32">
                          <IndicatorSparkline
                            values={indicator.spark}
                            rising={(indicator.monthChangePercent ?? 0) >= 0}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t border-edge px-5 py-3 text-xs text-ink-faint">
              Showing {visible.length} of {indicators.length} indicators in{" "}
              {GROUP_LABEL[group]}.
            </p>
          </section>

          {/* Named rather than silently missing: the mockup asks for release
              series this source does not carry. */}
          <p className="mt-4 rounded-lg border border-edge bg-panel-raised/40 px-4 py-3 text-xs text-ink-faint">
            Not carried yet — {UNAVAILABLE_INDICATORS.join(", ")}. These are statistical
            releases rather than traded instruments, so the price feed does not publish
            them; adding them needs a FRED API key.
          </p>
        </>
      ) : null}
    </main>
  );
}
