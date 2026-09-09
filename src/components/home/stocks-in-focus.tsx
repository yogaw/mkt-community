import Link from "next/link";
import { stocksInFocus } from "@/features/home/market-data";
import { formatPrice } from "@/lib/datetime/format";
import { cn } from "@/lib/cn";

export function StocksInFocus() {
  return (
    <section aria-label="Stocks in focus">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Stocks in Focus</h2>
        <span className="text-xs text-ink-faint">Selected by Piranha</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stocksInFocus.map((stock) => {
          const isUp = stock.changePercent >= 0;
          const changeLabel = `${isUp ? "+" : ""}${stock.changePercent.toFixed(2)}%`;
          return (
            <article
              key={stock.ticker}
              className="flex flex-col rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-ink-faint"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-ink">{stock.ticker}</h3>
                  <p className="mt-0.5 text-xs text-ink-faint">{stock.company}</p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    isUp ? "bg-accent/10 text-accent" : "bg-down/10 text-down",
                  )}
                >
                  {changeLabel}
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-ink">{formatPrice(stock.price)}</p>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">{stock.thesis}</p>

              {stock.keyLevel !== null ? (
                <p className="mt-4 text-xs text-ink-faint">
                  <span className="uppercase tracking-wider">Key Level</span>
                  <span className="ml-2 font-semibold text-ink">{formatPrice(stock.keyLevel)}</span>
                </p>
              ) : null}

              <Link
                href={stock.href}
                className="mt-3 text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
              >
                View Analysis &rarr;
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
