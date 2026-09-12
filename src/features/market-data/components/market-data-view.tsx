"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
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
import { IndicatorChart } from "./indicator-chart";

type Status = "loading" | "ready" | "error";

/**
 * Ranges start at one month because the stored series is daily. A 1D or 1W
 * button would be drawing two or five points; intraday is a separate feed.
 */
const RANGES = [
  { key: "1M", sessions: 22 },
  { key: "3M", sessions: 63 },
  { key: "6M", sessions: 126 },
  { key: "1Y", sessions: 252 },
  { key: "ALL", sessions: Number.MAX_SAFE_INTEGER },
] as const;

const CATEGORIES: Array<IndicatorCategory | "All"> = ["All", "Equity", "Rates", "Currency", "Commodities"];

export function MarketDataView() {
  const router = useRouter();
  const [group, setGroup] = useState<IndicatorGroup>("GLOBAL");
  const [category, setCategory] = useState<IndicatorCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("3M");
  const [selected, setSelected] = useState<string | null>(null);

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
      setSelected((current) =>
        result.body.data.some((item) => item.code === current)
          ? current
          : (result.body.data[0]?.code ?? null),
      );
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [group, reloadKey, router]);

  const sidebarItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return indicators
      .filter((item) => category === "All" || item.category === category)
      .filter(
        (item) =>
          term === "" ||
          item.label.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term),
      );
  }, [indicators, category, search]);

  const active = indicators.find((item) => item.code === selected) ?? null;
  const asOf = indicators[0]?.latestDate ?? null;

  const chartPoints = useMemo(() => {
    if (!active) {
      return [];
    }
    const sessions = RANGES.find((item) => item.key === range)!.sessions;
    return active.series.slice(-sessions);
  }, [active, range]);

  function exportCsv() {
    // Built from what is on screen, so the file and the page always agree.
    const header = "code,label,description,latest_date,latest,daily_change_pct,month_change_pct";
    const lines = indicators.map((item) =>
      [
        item.code,
        JSON.stringify(item.label),
        JSON.stringify(item.description),
        item.latestDate,
        item.latest,
        item.dailyChangePercent ?? "",
        item.monthChangePercent ?? "",
      ].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `market-data-${group.toLowerCase()}-${asOf ?? "latest"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Global market data, cross-asset charts and macro indicators — all in one place.
        </p>
        <div className="flex items-center gap-3">
          {asOf ? (
            <span className="text-xs text-ink-faint">End of day · {formatTradingDate(asOf)}</span>
          ) : null}
          <div className="w-fit">
            <Button variant="secondary" onClick={exportCsv} disabled={indicators.length === 0} className="px-4">
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 border-b border-edge">
        <div role="tablist" aria-label="Market groups" className="flex gap-1 overflow-x-auto">
          {INDICATOR_GROUPS.map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={group === value}
              onClick={() => {
                if (group !== value) {
                  setStatus("loading");
                  setCategory("All");
                  setSearch("");
                  setGroup(value);
                }
              }}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                group === value
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {GROUP_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-6 rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load market data.</p>
          <Button onClick={() => { setStatus("loading"); setReloadKey((key) => key + 1); }} className="mx-auto mt-4 w-auto px-6">
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

      {status === "ready" && active ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          {/* Explore rail */}
          <aside className="rounded-xl border border-edge bg-panel p-4">
            <h2 className="text-sm font-semibold text-ink">Explore {GROUP_LABEL[group]}</h2>
            <div className="mt-3">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search indicators or symbols..."
                aria-label="Search indicators"
                className="py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    category === value ? "bg-accent text-accent-ink" : "bg-panel-raised text-ink-muted hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Key Metrics</p>
            <ul className="mt-2 space-y-1">
              {sidebarItems.map((item) => {
                const isActive = item.code === active.code;
                return (
                  <li key={item.code}>
                    <button
                      type="button"
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => setSelected(item.code)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border-l-2 px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-accent bg-accent/5"
                          : "border-transparent hover:bg-panel-raised",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="block truncate text-xs text-ink-faint">{item.description}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs font-semibold", changeTone(item.dailyChangePercent, item.invertTone))}>
                        {formatChange(item.dailyChangePercent)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {sidebarItems.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-faint">Nothing matches that search.</li>
              ) : null}
            </ul>
          </aside>

          <div className="min-w-0 space-y-4">
            {/* Selected indicator */}
            <section className="rounded-xl border border-edge bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">{active.label}</h2>
                    <p className="text-sm text-ink-muted">{active.description}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {active.code} · {GROUP_LABEL[active.group]} · {active.category}
                  </p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-semibold tracking-tight text-ink">
                      {formatIndicatorValue(active.latest, active.unit, active.decimals)}
                    </span>
                    <span className={cn("text-sm font-semibold", changeTone(active.dailyChangePercent, active.invertTone))}>
                      {active.changeAbsolute === null
                        ? "—"
                        : `${active.changeAbsolute > 0 ? "+" : ""}${active.changeAbsolute.toFixed(active.decimals)}`}{" "}
                      ({formatChange(active.dailyChangePercent)})
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                  <Stat label="Previous Close" value={active.previousClose === null ? "—" : formatIndicatorValue(active.previousClose, active.unit, active.decimals)} />
                  <Stat
                    label="Day Range"
                    value={
                      active.dayLow === null || active.dayHigh === null
                        ? "—"
                        : `${formatIndicatorValue(active.dayLow, active.unit, active.decimals)} – ${formatIndicatorValue(active.dayHigh, active.unit, active.decimals)}`
                    }
                  />
                  <Stat
                    label="52W Range"
                    value={
                      active.week52Low === null || active.week52High === null
                        ? "—"
                        : `${formatIndicatorValue(active.week52Low, active.unit, active.decimals)} – ${formatIndicatorValue(active.week52High, active.unit, active.decimals)}`
                    }
                  />
                </dl>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-1">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={range === item.key}
                    onClick={() => setRange(item.key)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                      range === item.key ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {item.key}
                  </button>
                ))}
                <span className="ml-2 text-xs text-ink-faint">Daily closes</span>
              </div>

              <div className="mt-3">
                <IndicatorChart
                  points={chartPoints}
                  previousClose={active.previousClose}
                  unit={active.unit}
                  decimals={active.decimals}
                  rising={(active.dailyChangePercent ?? 0) >= 0}
                />
              </div>
            </section>

            {/* Peer strip */}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {indicators.slice(0, 6).map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.code)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-panel p-3 text-left transition-colors",
                      item.code === active.code ? "border-accent" : "border-edge hover:border-ink-faint",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink-faint">{item.label}</span>
                      <span className="block text-sm font-semibold text-ink">
                        {formatIndicatorValue(item.latest, item.unit, item.decimals)}
                      </span>
                      <span className={cn("block text-xs font-semibold", changeTone(item.dailyChangePercent, item.invertTone))}>
                        {formatChange(item.dailyChangePercent)}
                      </span>
                    </span>
                    <span className="w-16 shrink-0">
                      <IndicatorSparkline
                        values={item.series.slice(-63).map((point) => point.close)}
                        rising={(item.monthChangePercent ?? 0) >= 0}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Related markets */}
            <section className="rounded-xl border border-edge bg-panel">
              <h3 className="border-b border-edge px-5 py-4 text-base font-semibold text-ink">
                Related {GROUP_LABEL[group]}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className="border-b border-edge">
                      <th scope="col" className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Symbol</th>
                      <th scope="col" className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Name</th>
                      <th scope="col" className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Last</th>
                      <th scope="col" className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Change</th>
                      <th scope="col" className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {indicators.map((item) => (
                      <tr
                        key={item.code}
                        onClick={() => setSelected(item.code)}
                        className={cn("cursor-pointer transition-colors", item.code === active.code ? "bg-accent/5" : "hover:bg-panel-raised/50")}
                      >
                        <td className="px-5 py-2.5 text-sm font-semibold text-accent">{item.code}</td>
                        <td className="px-5 py-2.5 text-sm text-ink-muted">{item.description}</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold whitespace-nowrap text-ink">
                          {formatIndicatorValue(item.latest, item.unit, item.decimals)}
                        </td>
                        <td className={cn("px-5 py-2.5 text-right text-sm whitespace-nowrap", changeTone(item.dailyChangePercent, item.invertTone))}>
                          {item.changeAbsolute === null ? "—" : `${item.changeAbsolute > 0 ? "+" : ""}${item.changeAbsolute.toFixed(item.decimals)}`}
                        </td>
                        <td className={cn("px-5 py-2.5 text-right text-sm font-semibold whitespace-nowrap", changeTone(item.dailyChangePercent, item.invertTone))}>
                          {formatChange(item.dailyChangePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="rounded-lg border border-edge bg-panel-raised/40 px-4 py-3 text-xs text-ink-faint">
              Not carried — {UNAVAILABLE_INDICATORS.join("; ")}. Statistical releases need a
              FRED key; the rest are not published by this price feed. Ranges start at 1M
              because the stored series is a daily close, not intraday.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold whitespace-nowrap text-ink">{value}</dd>
    </div>
  );
}
