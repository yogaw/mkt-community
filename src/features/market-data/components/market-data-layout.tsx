"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import { formatTradingDate } from "@/features/market-overview/market-format";
import {
  DEFAULT_INSTRUMENT,
  SECTION_CATEGORIES,
} from "@/features/market-data/catalogue/instruments";
import {
  MARKET_SECTIONS,
  SECTION_LABEL,
  SECTION_SUBTITLE,
  type Instrument,
  type InstrumentCategory,
  type MarketSection,
} from "@/features/market-data/market-data-model";
import {
  describeInstrument,
  formatChange,
  formatChangePercent,
  formatValue,
  isFavourable,
  toneFor,
} from "@/features/market-data/instrument-format";
import { DataSourceBadge, MarketStatus, StaleWarning } from "./data-badges";
import { MarketChart } from "./market-chart";
import { SECTION_INSIGHT } from "./market-insight-card";
import { IndicatorSparkline } from "./indicator-sparkline";

type Status = "loading" | "ready" | "error";

/** A stable identity, so the empty case does not re-run every memo. */
const NO_INSTRUMENTS: Instrument[] = [];

/**
 * Timeframes are expressed in sessions. 1D and 1W are offered but marked
 * unavailable rather than hidden: the stored series is a daily close, so a 1D
 * view would plot a single point. Drawing that and calling it intraday would be
 * a lie told in pixels.
 */
const TIMEFRAMES = [
  { key: "1D", sessions: 1, available: false },
  { key: "1W", sessions: 5, available: false },
  { key: "1M", sessions: 22, available: true },
  { key: "3M", sessions: 63, available: true },
  { key: "1Y", sessions: 252, available: true },
  { key: "5Y", sessions: 1260, available: false },
  { key: "ALL", sessions: Number.MAX_SAFE_INTEGER, available: true },
] as const;

type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

export function MarketDataLayout({ section }: { section: MarketSection }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * The request is identified by what it is for, and the outcome carries that
   * identity with it. Loading is then something we can read off the two —
   * "no answer for this request yet" — rather than a flag an effect has to
   * remember to set on the way in and clear on every way out.
   */
  const request = `${section}:${reloadKey}`;
  const [loaded, setLoaded] = useState<{
    request: string;
    instruments: Instrument[];
  } | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    DEFAULT_INSTRUMENT[section],
  );
  const [category, setCategory] = useState<InstrumentCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeKey>("3M");
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  const instruments =
    loaded?.request === request ? loaded.instruments : NO_INSTRUMENTS;
  const status: Status =
    loaded?.request === request
      ? "ready"
      : failedRequest === request
        ? "error"
        : "loading";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: Instrument[] }>(
        `/api/v1/market-data?section=${section}`,
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
        setFailedRequest(request);
        return;
      }
      setLoaded({ request, instruments: result.body.data });
      setSelectedSymbol((current) =>
        result.body.data.some((item) => item.symbol === current)
          ? current
          : (result.body.data.find(
              (item) => item.symbol === DEFAULT_INSTRUMENT[section],
            )?.symbol ??
            result.body.data[0]?.symbol ??
            ""),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [section, request, router]);

  const selected =
    instruments.find((item) => item.symbol === selectedSymbol) ?? null;

  const exploreItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return instruments
      .filter((item) => category === "All" || item.category === category)
      .filter(
        (item) =>
          term === "" ||
          item.symbol.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          (item.benchmark ?? "").toLowerCase().includes(term),
      );
  }, [instruments, category, search]);

  const chartPoints = useMemo(() => {
    if (!selected) {
      return [];
    }
    const frame = TIMEFRAMES.find((item) => item.key === timeframe)!;
    return selected.history.slice(-frame.sessions);
  }, [selected, timeframe]);

  /*
   * The reference for "is this series behind?" comes from the connected feeds
   * only. Generated series are anchored to the freshest observation anywhere,
   * so including them would let placeholder data make real data look stale.
   */
  const latestTimestamp = instruments
    .filter((item) => item.dataStatus !== "SAMPLE")
    .reduce(
      (latest, item) => (item.timestamp > latest ? item.timestamp : latest),
      "",
    );

  const insight = SECTION_INSIGHT[section];
  const summaryCards = instruments.slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {SECTION_LABEL[section]}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            {SECTION_SUBTITLE[section]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MarketStatus section={section} />
          {latestTimestamp ? (
            <span className="text-xs text-ink-faint">
              Updated {formatTradingDate(latestTimestamp)}
            </span>
          ) : null}
          <div className="w-fit">
            <Button
              variant="secondary"
              className="px-4"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={status === "loading"}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Section tabs are links, so a section deep-links and the back button
          works; Next keeps it a client transition, not a reload. */}
      <nav aria-label="Market sections" className="mt-5 border-b border-edge">
        <ul className="flex gap-1 overflow-x-auto">
          {MARKET_SECTIONS.map((value) => (
            <li key={value}>
              <Link
                href={`/market-data/${value}`}
                aria-current={value === section ? "page" : undefined}
                className={cn(
                  "block shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  value === section
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {SECTION_LABEL[value]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {status === "error" ? (
        <div className="mt-6 rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">
            We could not load {SECTION_LABEL[section]}.
          </p>
          <Button
            onClick={() => setReloadKey((key) => key + 1)}
            className="mx-auto mt-4 w-auto px-6"
          >
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && instruments.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-edge bg-panel p-10 text-center">
          <p className="font-medium text-ink">
            No instruments available in this section
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Run{" "}
            <code className="rounded bg-panel-raised px-1.5 py-0.5 text-xs">
              npm run fetch:market-indicators
            </code>{" "}
            to populate the connected feeds.
          </p>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <Skeleton className="hidden h-[560px] rounded-xl lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-[420px] rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      ) : null}

      {status === "ready" && selected ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          {/* Explore: a drawer on small screens, a column from lg up. */}
          <button
            type="button"
            onClick={() => setIsExploreOpen(true)}
            className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3 text-sm font-medium text-ink lg:hidden"
          >
            Explore {SECTION_LABEL[section]}
            <span className="text-ink-faint">
              {instruments.length} instruments
            </span>
          </button>

          {isExploreOpen ? (
            <div
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              onClick={() => setIsExploreOpen(false)}
              aria-hidden="true"
            />
          ) : null}

          <aside
            className={cn(
              "rounded-xl border border-edge bg-panel p-4",
              "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[min(20rem,90vw)] max-lg:overflow-y-auto max-lg:rounded-none max-lg:transition-transform",
              isExploreOpen
                ? "max-lg:translate-x-0"
                : "max-lg:-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Explore Data</h2>
              <button
                type="button"
                onClick={() => setIsExploreOpen(false)}
                aria-label="Close explore panel"
                className="rounded-lg p-1 text-ink-faint hover:text-ink lg:hidden"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-3">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search instruments..."
                aria-label="Search instruments"
                className="py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["All", ...SECTION_CATEGORIES[section]] as const).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={category === value}
                    onClick={() =>
                      setCategory(value as InstrumentCategory | "All")
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                      category === value
                        ? "bg-accent text-accent-ink"
                        : "bg-panel-raised text-ink-muted hover:text-ink",
                    )}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Key Metrics
            </p>
            <ul className="mt-2 space-y-0.5">
              {exploreItems.map((item) => (
                <li key={item.symbol}>
                  <button
                    type="button"
                    aria-current={
                      item.symbol === selected.symbol ? "true" : undefined
                    }
                    onClick={() => {
                      setSelectedSymbol(item.symbol);
                      setIsExploreOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border-l-2 px-3 py-2 text-left transition-colors",
                      item.symbol === selected.symbol
                        ? "border-accent bg-accent/5"
                        : "border-transparent hover:bg-panel-raised",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {item.symbol}
                      </span>
                      <span className="block truncate text-xs text-ink-faint">
                        {item.name}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold",
                        toneFor(item),
                      )}
                    >
                      {formatChangePercent(item)}
                    </span>
                  </button>
                </li>
              ))}
              {exploreItems.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-faint">
                  Nothing matches that search.
                </li>
              ) : null}
            </ul>

            {/* The watchlist here is a boundary, not a second system: the one
                that exists is tied to signals, and instruments are not signals. */}
            <p className="mt-5 rounded-lg border border-dashed border-edge px-3 py-2 text-xs text-ink-faint">
              Instrument watchlists are not wired up. The existing watchlist
              belongs to Signals and is not a fit for instruments.
            </p>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-edge bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">
                      {selected.symbol}
                    </h2>
                    <p className="text-sm text-ink-muted">{selected.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {describeInstrument(selected)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-semibold tracking-tight text-ink">
                      {formatValue(selected, selected.value)}
                    </span>
                    <span
                      className={cn("text-sm font-semibold", toneFor(selected))}
                    >
                      {formatChange(selected)}
                      {selected.preferBasisPoints
                        ? ""
                        : ` (${formatChangePercent(selected)})`}
                    </span>
                  </div>

                  <div className="mt-3">
                    <DataSourceBadge instrument={selected} />
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                  <Stat
                    label="Previous Close"
                    value={
                      selected.previousClose === null
                        ? "—"
                        : formatValue(selected, selected.previousClose)
                    }
                  />
                  <Stat
                    label="Day Range"
                    value={
                      selected.dayLow === null || selected.dayHigh === null
                        ? "Not published"
                        : `${formatValue(selected, selected.dayLow)} – ${formatValue(selected, selected.dayHigh)}`
                    }
                  />
                  <Stat
                    label="52W Range"
                    value={
                      selected.yearLow === null || selected.yearHigh === null
                        ? "—"
                        : `${formatValue(selected, selected.yearLow)} – ${formatValue(selected, selected.yearHigh)}`
                    }
                  />
                </dl>
              </div>

              {latestTimestamp ? (
                <div className="mt-3">
                  <StaleWarning
                    observedAt={selected.timestamp}
                    latest={latestTimestamp}
                  />
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-1">
                {TIMEFRAMES.map((frame) => (
                  <button
                    key={frame.key}
                    type="button"
                    aria-pressed={timeframe === frame.key}
                    disabled={!frame.available}
                    title={
                      frame.available
                        ? undefined
                        : "Needs an intraday or multi-year feed"
                    }
                    onClick={() => setTimeframe(frame.key)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                      timeframe === frame.key
                        ? "bg-accent text-accent-ink"
                        : "text-ink-muted hover:text-ink",
                      !frame.available &&
                        "cursor-not-allowed opacity-30 hover:text-ink-muted",
                    )}
                  >
                    {frame.key}
                  </button>
                ))}
                <span className="ml-2 text-xs text-ink-faint">
                  Daily closes
                </span>
              </div>

              <div className="mt-3">
                <MarketChart instrument={selected} points={chartPoints} />
              </div>
            </section>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((item) => (
                <li key={item.symbol}>
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-panel p-3 text-left transition-colors",
                      item.symbol === selected.symbol
                        ? "border-accent"
                        : "border-edge hover:border-ink-faint",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-ink-faint">
                        {item.name}
                      </span>
                      <span className="block text-sm font-semibold text-ink">
                        {formatValue(item, item.value)}
                      </span>
                      <span
                        className={cn(
                          "block text-xs font-semibold",
                          toneFor(item),
                        )}
                      >
                        {formatChange(item)}
                      </span>
                    </span>
                    <span className="w-16 shrink-0">
                      <IndicatorSparkline
                        values={item.history
                          .slice(-63)
                          .map((point) => point.close)}
                        rising={isFavourable(item) !== false}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Full width, both of them. Side by side these were squeezed to
                around 500px each, which cut the table's change column off
                mid-number — a price feed that hides the change is no use. */}
            <section className="rounded-xl border border-edge bg-panel">
              <h3 className="border-b border-edge px-5 py-4 text-base font-semibold text-ink">
                Related {SECTION_LABEL[section]}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr className="border-b border-edge">
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint"
                      >
                        Symbol
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint"
                      >
                        {section === "commodities" ? "Benchmark" : "Name"}
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint"
                      >
                        Last
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint"
                      >
                        Change
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint"
                      >
                        % Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {instruments.map((item) => (
                      <tr
                        key={item.symbol}
                        onClick={() => setSelectedSymbol(item.symbol)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          item.symbol === selected.symbol
                            ? "bg-accent/5"
                            : "hover:bg-panel-raised/50",
                        )}
                      >
                        <td className="px-5 py-2.5 text-sm font-semibold text-accent">
                          {item.symbol}
                        </td>
                        <td className="px-5 py-2.5 text-sm whitespace-nowrap text-ink-muted">
                          {section === "commodities"
                            ? (item.benchmark ?? item.name)
                            : item.name}
                        </td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold whitespace-nowrap text-ink">
                          {formatValue(item, item.value)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-2.5 text-right text-sm whitespace-nowrap",
                            toneFor(item),
                          )}
                        >
                          {formatChange(item)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-2.5 text-right text-sm font-semibold whitespace-nowrap",
                            toneFor(item),
                          )}
                        >
                          {item.preferBasisPoints
                            ? "—"
                            : formatChangePercent(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-edge bg-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">
                  Market Insight
                </h3>
                <span className="shrink-0 rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">
                  {insight.badge}
                </span>
              </div>

              <div className="mt-3 grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div>
                  <h4 className="font-semibold text-ink">{insight.headline}</h4>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {insight.publishedAt}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {insight.body}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-ink">
                    Key Takeaways
                  </h5>
                  <ul className="mt-2 space-y-1.5">
                    {insight.takeaways.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-4 border-t border-edge pt-3 text-xs text-ink-faint">
                Written by the desk. There is no editorial backend yet, so this
                is fixed copy rather than generated commentary.
              </p>
            </section>
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
      <dd className="mt-0.5 text-sm font-semibold whitespace-nowrap text-ink">
        {value}
      </dd>
    </div>
  );
}
