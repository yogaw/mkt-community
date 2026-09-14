"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { brokerColor } from "@/features/stock-analysis/broker-colors";
import {
  directionMark,
  formatLotsPlain,
  formatLotsSigned,
  formatPercentPlain,
  formatPrice,
  formatRupiah,
  formatValueSigned,
  toneFor,
} from "@/features/stock-analysis/stock-analysis-format";
import type { BrokerFlow } from "@/features/stock-analysis/stock-analysis-types";
import { InfoTooltip, TERMS } from "./info-tooltip";
import { EmptyPanel } from "./states";

type SortKey =
  | "brokerCode"
  | "buyValue"
  | "sellValue"
  | "netValue"
  | "buyLots"
  | "sellLots"
  | "netLots"
  | "buySharePercent"
  | "sellSharePercent"
  | "avgBuyPrice"
  | "avgSellPrice";

const PAGE_SIZE = 15;

const COLUMNS: Array<{ key: SortKey; label: string; align: "left" | "right"; tip?: string }> = [
  { key: "brokerCode", label: "Broker", align: "left" },
  { key: "buyValue", label: "Buy Value", align: "right" },
  { key: "sellValue", label: "Sell Value", align: "right" },
  { key: "netValue", label: "Net Value", align: "right", tip: TERMS.netBrokerFlow },
  { key: "buyLots", label: "Buy Lots", align: "right" },
  { key: "sellLots", label: "Sell Lots", align: "right" },
  { key: "netLots", label: "Net Lots", align: "right", tip: TERMS.netLots },
  { key: "buySharePercent", label: "Buy %", align: "right" },
  { key: "sellSharePercent", label: "Sell %", align: "right" },
  { key: "avgBuyPrice", label: "Avg Buy", align: "right", tip: TERMS.avgPrice },
  { key: "avgSellPrice", label: "Avg Sell", align: "right" },
];

/** Every broker that traded, sortable and searchable. */
export function BrokerTable({
  brokers,
  onSelectBroker,
}: {
  brokers: BrokerFlow[];
  onSelectBroker: (brokerCode: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "netValue",
    direction: "desc",
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = search.trim().toUpperCase();
    const filtered = term === "" ? brokers : brokers.filter((b) => b.brokerCode.includes(term));

    return [...filtered].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "string" || typeof right === "string") {
        return sort.direction === "asc"
          ? String(left).localeCompare(String(right))
          : String(right).localeCompare(String(left));
      }
      // Nulls sit at the bottom whichever way the column is sorted: a broker
      // that never traded that side has no price, and no price is not zero.
      const l = left ?? Number.NEGATIVE_INFINITY;
      const r = right ?? Number.NEGATIVE_INFINITY;
      return sort.direction === "asc" ? l - r : r - l;
    });
  }, [brokers, search, sort]);

  if (brokers.length === 0) {
    return (
      <EmptyPanel
        title="No broker detail for this period."
        description="No broker transactions were recorded in the selected range."
      />
    );
  }

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
        : { key, direction: key === "brokerCode" ? "asc" : "desc" },
    );
  }

  return (
    <section className="rounded-xl border border-edge bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Broker Detail</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {rows.length} of {brokers.length} brokers
          </p>
        </div>
        <label className="shrink-0">
          <span className="sr-only">Search broker code</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search broker..."
            className="w-40 rounded-lg border border-edge bg-panel-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </label>
      </header>

      <div className="max-h-[34rem] overflow-auto">
        <table className="w-full min-w-[62rem] border-collapse">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-edge">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <span className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {column.label}
                      {sort.key === column.key ? (
                        <span aria-hidden="true"> {sort.direction === "desc" ? "↓" : "↑"}</span>
                      ) : null}
                    </button>
                    {column.tip ? <InfoTooltip label={column.label}>{column.tip}</InfoTooltip> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-edge">
            {visible.map((broker) => (
              <tr
                key={broker.brokerCode}
                onClick={() => onSelectBroker(broker.brokerCode)}
                className="cursor-pointer transition-colors hover:bg-panel-raised/50"
              >
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: brokerColor(broker.brokerCode) }}
                    />
                    <span className="font-mono text-sm font-semibold text-accent">
                      {broker.brokerCode}
                    </span>
                  </span>
                </td>
                <Cell>{formatRupiah(broker.buyValue)}</Cell>
                <Cell>{formatRupiah(broker.sellValue)}</Cell>
                <Cell className={cn("font-semibold", toneFor(broker.netValue))}>
                  {directionMark(broker.netValue)} {formatValueSigned(broker.netValue)}
                </Cell>
                <Cell>{formatLotsPlain(broker.buyLots)}</Cell>
                <Cell>{formatLotsPlain(broker.sellLots)}</Cell>
                <Cell className={toneFor(broker.netLots)}>{formatLotsSigned(broker.netLots)}</Cell>
                <Cell>{formatPercentPlain(broker.buySharePercent)}</Cell>
                <Cell>{formatPercentPlain(broker.sellSharePercent)}</Cell>
                <Cell>{formatPrice(broker.avgBuyPrice, 2)}</Cell>
                <Cell>{formatPrice(broker.avgSellPrice, 2)}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-edge px-5 py-3">
          <span className="text-xs text-ink-faint">
            Page {safePage + 1} of {pageCount}
          </span>
          <span className="flex gap-2">
            <PageButton disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Previous
            </PageButton>
            <PageButton disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              Next
            </PageButton>
          </span>
        </div>
      ) : null}
    </section>
  );
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-2.5 text-right text-sm text-ink-muted", className)}>
      {children}
    </td>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-edge bg-panel-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
