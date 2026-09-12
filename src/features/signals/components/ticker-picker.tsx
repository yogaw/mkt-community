"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { StockOptionDto } from "@/features/signals/signal-types";

const SEARCH_DEBOUNCE_MS = 200;
const PAGE_SIZE = 50;

interface TickerPickerProps {
  value: string;
  onChange: (ticker: string, name: string) => void;
  error?: string;
}

/*
 * A searchable list rather than a <select>: the IDX universe runs to ~900
 * listings, which no native dropdown makes navigable. Filtering happens on the
 * server so the whole list never has to reach the browser.
 */
export function TickerPicker({ value, onChange, error }: TickerPickerProps) {
  const inputId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState(value);
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [options, setOptions] = useState<StockOptionDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (debouncedTerm) {
        query.set("search", debouncedTerm);
      }
      const result = await authedFetch<{ data: StockOptionDto[] }>(
        `/api/v1/stocks?${query.toString()}`,
      );
      if (cancelled || result.outcome !== "loaded") {
        return;
      }
      setOptions(result.body.data);
      setActiveIndex(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedTerm]);

  // Close when focus or a click leaves the control.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function select(option: StockOptionDto) {
    setTerm(option.ticker);
    setSelectedName(option.name);
    setIsOpen(false);
    onChange(option.ticker, option.name);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        if (options.length === 0) return 0;
        return (index + step + options.length) % options.length;
      });
      return;
    }
    if (event.key === "Enter" && isOpen && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex]);
      return;
    }
    if (event.key === "Escape" && isOpen) {
      // Keep Escape inside the list so it does not also close the dialog.
      event.stopPropagation();
      setIsOpen(false);
    }
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink-muted">
        Ticker
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Search ticker or company…"
          value={term}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setTerm(event.target.value.toUpperCase());
            setSelectedName("");
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink",
            "placeholder:text-ink-faint focus:border-accent focus:outline-none",
            error && "border-down focus:border-down",
          )}
        />

        {isOpen ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tickers"
            className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-edge bg-panel py-1 shadow-xl"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-faint">No matching listing.</li>
            ) : (
              options.map((option, index) => (
                <li key={option.ticker} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    // Runs before the input's blur, so the click is not lost.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      select(option);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm",
                      index === activeIndex ? "bg-panel-raised text-ink" : "text-ink-muted",
                    )}
                  >
                    <span className="font-semibold text-ink">{option.ticker}</span>
                    <span className="truncate text-xs">{option.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {selectedName ? <p className="text-xs text-ink-faint">{selectedName}</p> : null}
      {error ? <p className="text-xs text-down">{error}</p> : null}
    </div>
  );
}
