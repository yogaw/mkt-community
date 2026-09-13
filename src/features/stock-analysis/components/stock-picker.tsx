"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { StockSearchResult } from "@/features/stock-analysis/stock-analysis-types";
import { formatPercentSigned, formatPrice, toneFor } from "@/features/stock-analysis/stock-analysis-format";

const DEBOUNCE_MS = 250;

/**
 * The stock field inside the analysis controls.
 *
 * The ticker is the first thing the workspace asks for, so changing it must not
 * mean going somewhere else and coming back. Typing searches by ticker or
 * company name; choosing a result moves the workspace onto that stock.
 *
 * Not a plain `<select>`: there are 958 listings, which is a scroll nobody
 * wants, and a member who knows the ticker should be able to type it.
 */
export function StockPicker({
  ticker,
  onSelect,
}: {
  ticker: string;
  onSelect: (ticker: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<StockSearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const term = draft.trim();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        const url = term
          ? `/api/v1/stocks/search?q=${encodeURIComponent(term)}&limit=8`
          : "/api/v1/stocks/search?limit=8";
        const result = await authedFetch<{ data: StockSearchResult[] }>(url);
        if (!cancelled && result.outcome === "loaded") {
          setMatches(result.body.data);
          setHighlight(0);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, isOpen]);

  // A click anywhere else closes the list; a picker that traps the page is
  // worse than one that occasionally closes early.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  function choose(next: string) {
    setIsOpen(false);
    setDraft("");
    if (next !== ticker) {
      onSelect(next);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="stock-picker-list"
        aria-label="Stock"
        value={isOpen ? draft : ticker}
        placeholder={ticker}
        onFocus={() => {
          setIsOpen(true);
          setDraft("");
        }}
        onChange={(event) => setDraft(event.target.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            // Typing a full ticker and pressing Enter should just work, even
            // if the search has not answered yet.
            choose(matches[highlight]?.ticker ?? term);
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className={cn(
          "h-[38px] w-full rounded-lg border border-edge bg-panel-raised px-3",
          "font-mono text-sm font-semibold text-ink focus:border-accent focus:outline-none",
        )}
      />

      {isOpen ? (
        <ul
          id="stock-picker-list"
          role="listbox"
          className="absolute top-full left-0 z-40 mt-1 max-h-72 w-[min(22rem,80vw)] overflow-y-auto rounded-lg border border-edge bg-panel py-1 shadow-xl"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-faint">
              {term ? "No stock matches that." : "Loading…"}
            </li>
          ) : null}

          {matches.map((match, index) => (
            <li key={match.ticker}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(match.ticker)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  index === highlight ? "bg-panel-raised" : "hover:bg-panel-raised/60",
                )}
              >
                <span className="w-14 shrink-0 font-mono text-sm font-semibold text-accent">
                  {match.ticker}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                  {match.name ?? "Name not available"}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-semibold text-ink">
                    {formatPrice(match.lastPrice)}
                  </span>
                  <span className={cn("block text-[11px]", toneFor(match.changePercent ?? 0))}>
                    {formatPercentSigned(match.changePercent)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
