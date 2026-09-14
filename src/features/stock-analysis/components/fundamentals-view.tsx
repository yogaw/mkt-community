"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatCompact,
  formatMultiple,
  formatPercentPlain,
  formatPrice,
  formatRupiah,
} from "@/features/stock-analysis/stock-analysis-format";
import {
  FUNDAMENTAL_PERIODS,
  PERIOD_LABEL,
  STATEMENT_LABEL,
  type FundamentalPeriod,
  type StatementKind,
  type StockFundamentals,
} from "@/features/stock-analysis/fundamentals-types";
import { EmptyPanel } from "./states";

/**
 * The fundamentals dashboard.
 *
 * Every number here comes from the repository seam, and the provenance banner
 * is not decoration: in development the numbers are generated, and the screen
 * says so at the top in red. The service withholds sample data in production
 * entirely, so a paying member sees the empty state rather than invented
 * financials for a real listed company.
 */
export function FundamentalsView({
  fundamentals,
  period,
  onPeriodChange,
}: {
  fundamentals: StockFundamentals | null;
  period: FundamentalPeriod;
  onPeriodChange: (period: FundamentalPeriod) => void;
}) {
  const [statement, setStatement] = useState<StatementKind>("INCOME");

  if (!fundamentals) {
    return (
      <EmptyPanel
        title="No fundamental data for this stock."
        description="Piranha does not have a financial-statements provider connected yet. Broker analysis and market data on the other tabs are unaffected."
      />
    );
  }

  const isSample = fundamentals.provenance === "SAMPLE";
  const active = fundamentals.statements.find((item) => item.kind === statement);

  return (
    <div className="space-y-4">
      {isSample ? (
        <p className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          <strong className="font-semibold">Generated sample data.</strong> These are not the
          financials of the real company behind {fundamentals.ticker}. No statements provider is
          connected, so this exists to exercise the screen in development — it is never served in
          production.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Key Metrics</h2>
        <div className="flex gap-1">
          {FUNDAMENTAL_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => onPeriodChange(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                period === value
                  ? "bg-accent text-accent-ink"
                  : "text-ink-muted hover:bg-panel-raised hover:text-ink",
              )}
            >
              {PERIOD_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric label="Market Cap" value={money(fundamentals.metrics.marketCap)} />
        <Metric label="Revenue" value={money(fundamentals.metrics.revenue)} />
        <Metric label="Net Income" value={money(fundamentals.metrics.netIncome)} />
        <Metric label="EPS" value={fundamentals.metrics.eps === null ? "—" : `Rp ${formatPrice(fundamentals.metrics.eps, 2)}`} />
        <Metric label="PER" value={formatMultiple(fundamentals.metrics.per)} />
        <Metric label="PBV" value={formatMultiple(fundamentals.metrics.pbv)} />
        <Metric label="ROE" value={formatPercentPlain(fundamentals.metrics.roe)} />
        <Metric label="ROA" value={formatPercentPlain(fundamentals.metrics.roa)} />
        <Metric label="Debt / Equity" value={formatMultiple(fundamentals.metrics.debtToEquity)} />
        <Metric label="Dividend Yield" value={formatPercentPlain(fundamentals.metrics.dividendYield)} />
      </ul>

      <section className="rounded-xl border border-edge bg-panel">
        <div className="flex flex-wrap gap-1 border-b border-edge px-5 py-3">
          {fundamentals.statements.map((item) => (
            <button
              key={item.kind}
              type="button"
              aria-pressed={statement === item.kind}
              onClick={() => setStatement(item.kind)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statement === item.kind
                  ? "bg-panel-raised text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {STATEMENT_LABEL[item.kind]}
            </button>
          ))}
        </div>

        {active ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse">
              <thead>
                <tr className="border-b border-edge">
                  <th scope="col" className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {STATEMENT_LABEL[active.kind]}
                  </th>
                  {active.periods.map((label) => (
                    <th key={label} scope="col" className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {active.lines.map((line) => (
                  <tr key={line.label} className={line.emphasis ? "bg-panel-raised/30" : undefined}>
                    <th scope="row" className={cn("px-5 py-2.5 text-left text-sm", line.emphasis ? "font-semibold text-ink" : "font-normal text-ink-muted")}>
                      {line.label}
                    </th>
                    {line.values.map((value, index) => (
                      <td
                        key={index}
                        className={cn(
                          "px-5 py-2.5 text-right text-sm whitespace-nowrap",
                          value !== null && value < 0 ? "text-down" : "text-ink-muted",
                          line.emphasis && "font-semibold text-ink",
                        )}
                      >
                        {line.label.includes("EPS") ? formatPrice(value, 2) : money(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <TrendChart title="Revenue" points={fundamentals.revenueTrend} />
        <TrendChart title="Net Income" points={fundamentals.netIncomeTrend} />
        <TrendChart title="EPS" points={fundamentals.epsTrend} isPrice />
      </div>

      <section className="rounded-xl border border-edge bg-panel">
        <h2 className="border-b border-edge px-5 py-4 text-base font-semibold text-ink">Valuation</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse">
            <thead>
              <tr className="border-b border-edge">
                {["Metric", "Current", "1Y average", "3Y average", "Sector median"].map((label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint",
                      index === 0 ? "text-left" : "text-right",
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {fundamentals.valuation.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-5 py-2.5 text-left text-sm font-medium text-ink">
                    {row.label}
                  </th>
                  {[row.current, row.average1Y, row.average3Y, row.sectorMedian].map((value, index) => (
                    <td key={index} className="px-5 py-2.5 text-right text-sm whitespace-nowrap text-ink-muted">
                      {value === null
                        ? "—"
                        : row.unit === "%"
                          ? formatPercentPlain(value, 2)
                          : formatMultiple(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-edge px-5 py-3 text-xs text-ink-faint">
          Sector medians are blank: Piranha holds no sector classification, and a peer group
          assembled from guesswork would be worse than none.
        </p>
      </section>
    </div>
  );
}

function money(value: number | null): string {
  return value === null ? "—" : formatRupiah(value);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl border border-edge bg-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight whitespace-nowrap text-ink">{value}</p>
    </li>
  );
}

function TrendChart({
  title,
  points,
  isPrice,
}: {
  title: string;
  points: Array<{ period: string; value: number | null }>;
  isPrice?: boolean;
}) {
  const values = points.map((point) => point.value).filter((v): v is number => v !== null);
  if (values.length < 2) {
    return null;
  }

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  return (
    <section className="rounded-xl border border-edge bg-panel p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-3 flex h-28 items-end gap-2">
        {points.map((point) => (
          <li key={point.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="w-full text-center text-[10px] whitespace-nowrap text-ink-faint">
              {point.value === null ? "—" : isPrice ? formatPrice(point.value, 0) : formatCompact(point.value, 1)}
            </span>
            <span
              className="w-full rounded-t bg-accent/70"
              style={{ height: `${point.value === null ? 2 : Math.max(4, ((point.value - min) / span) * 72)}px` }}
            />
            <span className="text-[10px] text-ink-faint">{point.period}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
