"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import {
  formatFrequency,
  formatIndexLevel,
  formatPercent,
  formatPoints,
  formatRupiah,
  formatRupiahSigned,
  formatShares,
  formatTradingDate,
} from "@/features/market-overview/market-format";
import { netShareOfTurnover } from "@/features/market-overview/market-flow-math";
import type {
  ForeignFlowPointDto,
  MarketScope,
  MarketSummaryDto,
} from "@/features/market-overview/market-overview-types";
import { ForeignFlowChart } from "./foreign-flow-chart";

type Status = "loading" | "ready" | "error" | "empty";

const RANGES: Array<{ days: number; label: string }> = [
  { days: 5, label: "5D" },
  { days: 20, label: "20D" },
  { days: 30, label: "30D" },
  { days: 60, label: "3M" },
  { days: 120, label: "6M" },
  { days: 250, label: "1Y" },
];

const SCOPE_LABEL: Record<MarketScope, string> = {
  REGULAR: "Regular",
  ALL: "All Market",
};

export function MarketOverview() {
  const router = useRouter();

  const [summary, setSummary] = useState<MarketSummaryDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [date, setDate] = useState<string | null>(null);
  const [scope, setScope] = useState<MarketScope>("REGULAR");

  const [series, setSeries] = useState<ForeignFlowPointDto[]>([]);
  const [days, setDays] = useState(30);
  const [isSeriesLoading, setIsSeriesLoading] = useState(true);

  const goToLogin = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // No date means "latest ingested session", which on a weekend is Friday.
      const path = date === null ? "/api/v1/market/summary/latest" : `/api/v1/market/summary/${date}`;
      const result = await authedFetch<{ data: MarketSummaryDto | null }>(path);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome !== "loaded") {
        setStatus("error");
        return;
      }
      if (result.body.data === null) {
        setStatus("empty");
        return;
      }
      setSummary(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [date, goToLogin]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: ForeignFlowPointDto[] }>(
        `/api/v1/market/foreign-flow?scope=${scope}&days=${days}`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
        return;
      }
      if (result.outcome === "loaded") {
        setSeries(result.body.data);
      }
      setIsSeriesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, days, goToLogin]);

  if (status === "loading") {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (status === "empty") {
    return (
      <section className="rounded-xl border border-edge bg-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Market Overview</h2>
        <p className="mt-2 text-sm text-ink-muted">
          No trading day has been ingested yet. Run{" "}
          <code className="rounded bg-panel-raised px-1.5 py-0.5 text-xs">
            npm run fetch:index-summary
          </code>{" "}
          and{" "}
          <code className="rounded bg-panel-raised px-1.5 py-0.5 text-xs">
            npm run build:market-flows
          </code>
          .
        </p>
      </section>
    );
  }

  if (status === "error" || summary === null) {
    return (
      <section className="rounded-xl border border-edge bg-panel p-6 text-center">
        <p className="text-sm text-ink-muted">We could not load the market overview.</p>
        <Button
          onClick={() => {
            setStatus("loading");
            setDate((current) => current);
          }}
          className="mx-auto mt-4 w-auto px-6"
        >
          Try Again
        </Button>
      </section>
    );
  }

  const { ihsg, activity } = summary;
  const flow = summary.foreign[scope === "REGULAR" ? "regular" : "all"];
  const isUp = (ihsg.change ?? 0) >= 0;
  const netShare = flow ? netShareOfTurnover(flow) : null;

  return (
    <section aria-label="IDX market overview" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Market Overview</h2>
        <p className="text-xs text-ink-faint">
          IDX end-of-day · {formatTradingDate(summary.date)}
          {summary.date !== summary.latestDate ? " · historical" : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* IHSG */}
        <div className="rounded-xl border border-edge bg-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">IHSG</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight text-ink">
              {formatIndexLevel(ihsg.close)}
            </span>
            {ihsg.change !== null ? (
              <span className={cn("text-sm font-semibold", isUp ? "text-accent" : "text-down")}>
                {formatPoints(ihsg.change)}
                {ihsg.changePercent !== null ? ` (${formatPercent(ihsg.changePercent)})` : ""}
              </span>
            ) : null}
          </div>

          {/* No Open: GetIndexSummary publishes none for an index, so the field
              is absent rather than filled with the previous close. */}
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Figure label="High" value={ihsg.high === null ? "—" : formatIndexLevel(ihsg.high)} />
            <Figure label="Low" value={ihsg.low === null ? "—" : formatIndexLevel(ihsg.low)} />
            <Figure
              label="Prev Close"
              value={ihsg.previous === null ? "—" : formatIndexLevel(ihsg.previous)}
            />
          </dl>

          {ihsg.marketCapital !== null ? (
            <p className="mt-4 text-xs text-ink-faint">
              Market cap {formatRupiah(ihsg.marketCapital)}
              {ihsg.numberOfStock !== null ? ` · ${ihsg.numberOfStock} listings` : ""}
            </p>
          ) : null}
        </div>

        {/* Market activity */}
        <div className="rounded-xl border border-edge bg-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Market Activity
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-faint">
                <th scope="col" className="pb-2 text-left font-medium">&nbsp;</th>
                <th scope="col" className="pb-2 text-right font-medium">All Market</th>
                <th scope="col" className="pb-2 text-right font-medium">Regular</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              <ActivityRow
                label="Volume"
                hint="shares"
                all={activity.all.volume === null ? null : formatShares(activity.all.volume)}
                regular={activity.regular.volume === null ? null : formatShares(activity.regular.volume)}
              />
              <ActivityRow
                label="Value"
                all={activity.all.value === null ? null : formatRupiah(activity.all.value)}
                regular={activity.regular.value === null ? null : formatRupiah(activity.regular.value)}
              />
              <ActivityRow
                label="Frequency"
                all={activity.all.frequency === null ? null : formatFrequency(activity.all.frequency)}
                regular={
                  activity.regular.frequency === null ? null : formatFrequency(activity.regular.frequency)
                }
                // IDX publishes no Regular-only trade count; see the service.
                regularNote="not published per board"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Foreign flow, with scope and trading-day navigation */}
      <div className="rounded-xl border border-edge bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Foreign Flow
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeToggle scope={scope} onChange={setScope} />
            <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel-raised px-1 py-1">
              <NavButton
                label="Previous trading day"
                disabled={summary.previousDate === null}
                onClick={() => setDate(summary.previousDate)}
              >
                ‹
              </NavButton>
              <span className="min-w-[104px] text-center text-sm font-medium text-ink">
                {formatTradingDate(summary.date)}
              </span>
              <NavButton
                label="Next trading day"
                disabled={summary.nextDate === null}
                onClick={() => setDate(summary.nextDate)}
              >
                ›
              </NavButton>
            </div>
          </div>
        </div>

        {flow === null ? (
          <p className="mt-4 text-sm text-ink-muted">
            No {SCOPE_LABEL[scope].toLowerCase()} flow recorded for this session.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FlowFigure label="F Buy" value={formatRupiah(flow.buyValue)} />
            <FlowFigure label="F Sell" value={formatRupiah(flow.sellValue)} />
            <FlowFigure
              label="Net Foreign"
              value={formatRupiahSigned(flow.netValue)}
              tone={flow.netValue >= 0 ? "up" : "down"}
              note={
                netShare === null
                  ? undefined
                  : `${formatPercent(netShare)} of ${SCOPE_LABEL[scope].toLowerCase()} turnover`
              }
            />
          </div>
        )}
      </div>

      {/* Net foreign flow history */}
      <div className="rounded-xl border border-edge bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Net Foreign Flow
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeToggle scope={scope} onChange={setScope} />
            <div className="flex gap-1">
              {RANGES.map((range) => (
                <button
                  key={range.days}
                  type="button"
                  aria-pressed={days === range.days}
                  onClick={() => {
                    setIsSeriesLoading(true);
                    setDays(range.days);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    days === range.days
                      ? "bg-accent text-accent-ink"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {isSeriesLoading ? (
            <Skeleton className="h-[260px] rounded-lg" />
          ) : series.length === 0 ? (
            <p className="text-sm text-ink-muted">No flow history for this range yet.</p>
          ) : (
            <ForeignFlowChart points={series} />
          )}
        </div>
      </div>
    </section>
  );
}

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: MarketScope;
  onChange: (scope: MarketScope) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-edge bg-panel-raised p-1">
      {(["REGULAR", "ALL"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={scope === value}
          onClick={() => onChange(value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            scope === value ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {SCOPE_LABEL[value]}
        </button>
      ))}
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-2 py-0.5 text-base leading-none text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ActivityRow({
  label,
  hint,
  all,
  regular,
  regularNote,
}: {
  label: string;
  hint?: string;
  all: string | null;
  regular: string | null;
  regularNote?: string;
}) {
  return (
    <tr>
      <th scope="row" className="py-2 text-left font-medium text-ink-muted">
        {label}
        {hint ? <span className="ml-1 text-xs text-ink-faint">({hint})</span> : null}
      </th>
      <td className="py-2 text-right font-semibold text-ink">{all ?? "—"}</td>
      <td className="py-2 text-right font-semibold text-ink">
        {regular ?? <span className="text-xs font-normal text-ink-faint">{regularNote ?? "—"}</span>}
      </td>
    </tr>
  );
}

function FlowFigure({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-panel-raised/40 px-4 py-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight",
          tone === "up" ? "text-accent" : tone === "down" ? "text-down" : "text-ink",
        )}
      >
        {value}
      </p>
      {note ? <p className="mt-0.5 text-xs text-ink-faint">{note}</p> : null}
    </div>
  );
}
