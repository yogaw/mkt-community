import Link from "next/link";
import { todaysInsights } from "@/features/home/market-data";

export function WhatMattersToday() {
  return (
    <section aria-label="What matters today">
      <h2 className="text-lg font-semibold tracking-tight text-ink">What Matters Today</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {todaysInsights.map((insight, index) => (
          <article
            key={insight.id}
            className="flex flex-col rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-ink-faint"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-semibold text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">{insight.topic}</span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{insight.statement}</p>
            <p className="mt-4 text-xs font-semibold text-ink-faint">{insight.tickers.join(" · ")}</p>
            <Link
              href={insight.href}
              className="mt-3 text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              Read Insight &rarr;
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
