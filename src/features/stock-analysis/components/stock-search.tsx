"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { SearchInput } from "@/components/ui/search-input";
import {
  directionMark,
  formatPercentSigned,
  formatPrice,
  formatRupiah,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { StockSearchResult } from "@/features/stock-analysis/stock-analysis-types";
import { Sparkline } from "./sparkline";
import { EmptyPanel, TableSkeleton } from "./states";

export function StockSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchInput
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search stock or ticker..."
      aria-label="Search stock or ticker"
    />
  );
}

/** A list of stocks, used for search results and every discovery section. */
export function StockResultList({
  title,
  description,
  stocks,
  isLoading,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description?: string;
  stocks: StockSearchResult[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section className="rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </header>

      {isLoading ? <TableSkeleton rows={5} /> : null}

      {!isLoading && stocks.length === 0 ? (
        <div className="p-5">
          <EmptyPanel title={emptyTitle} description={emptyDescription} />
        </div>
      ) : null}

      {!isLoading && stocks.length > 0 ? (
        <ul className="divide-y divide-edge">
          {stocks.map((stock) => (
            <li key={stock.ticker}>
              <Link
                href={`/stock-analysis/${stock.ticker}`}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-panel-raised/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <span className="w-20 shrink-0">
                  <span className="block font-mono text-sm font-semibold text-accent">
                    {stock.ticker}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">
                    {stock.name ?? "Name not available"}
                  </span>
                  {stock.valueTraded !== null ? (
                    <span className="block text-xs text-ink-faint">
                      {formatRupiah(stock.valueTraded)} traded
                    </span>
                  ) : null}
                </span>

                <span className="hidden shrink-0 sm:block">
                  <Sparkline values={stock.spark} rising={(stock.changePercent ?? 0) >= 0} />
                </span>

                <span className="w-24 shrink-0 text-right">
                  <span className="block text-sm font-semibold text-ink">
                    {formatPrice(stock.lastPrice)}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-semibold whitespace-nowrap",
                      toneFor(stock.changePercent ?? 0),
                    )}
                  >
                    {directionMark(stock.changePercent ?? 0)}{" "}
                    {formatPercentSigned(stock.changePercent)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
