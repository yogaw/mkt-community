"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A definition, one tap away.
 *
 * Piranha is an educational product as much as an analytical one, so the terms
 * that carry the most meaning — net broker flow, concentration, accumulation —
 * explain themselves rather than assuming the reader already knows.
 *
 * Focusable and described by aria-describedby, so it is not a hover-only affair
 * that a keyboard or a touchscreen cannot reach.
 */
export function InfoTooltip({ label, children }: { label: string; children: string }) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={isOpen ? id : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className={cn(
          "ml-1 flex h-4 w-4 items-center justify-center rounded-full border border-edge text-[10px] font-semibold",
          "text-ink-faint transition-colors hover:border-ink-faint hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        )}
      >
        i
      </button>

      {isOpen ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg border border-edge bg-panel p-3 text-xs leading-relaxed font-normal text-ink-muted shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

/** The definitions the board uses, in one place so they stay consistent. */
export const TERMS = {
  netBrokerFlow:
    "Total broker buy value minus total broker sell value for the selected period.",
  concentration:
    "How much of the total absolute net flow is concentrated among the largest brokers. High concentration means a few desks drove the period; low means it was spread widely.",
  accumulation:
    "Net buying across brokers during the selected period. This does not identify the underlying investor — a broker code is where a trade was executed, not who placed it.",
  brokerProxy:
    "Broker-flow patterns represent transactions executed through brokers and do not identify the underlying beneficial owner.",
  flowInterpretation:
    "Flow interpretation — not a trading signal. It describes how price and broker flow moved together over the period, not why.",
  netLots: "Broker buy volume minus sell volume, in lots. One lot is 100 shares.",
  avgPrice:
    "Value divided by shares traded on that side. It is the broker's volume-weighted average, not the day's closing price.",
} as const;
