import { indonesiaMarketSnapshot } from "@/features/home/market-data";
import { formatPrice } from "@/lib/datetime/format";
import { cn } from "@/lib/cn";

export function MarketSnapshot() {
  const snapshot = indonesiaMarketSnapshot;
  const isUp = snapshot.changePercent >= 0;
  const changeLabel = `${isUp ? "+" : ""}${snapshot.changePercent.toFixed(2)}%`;

  return (
    <section aria-label="Indonesia market snapshot" className="rounded-xl border border-edge bg-panel px-5 py-4 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Indonesia Market</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold text-ink">{snapshot.indexName}</span>
          <span className="text-2xl font-semibold tracking-tight text-ink">{formatPrice(snapshot.value, 2)}</span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-semibold",
              isUp ? "bg-accent/10 text-accent" : "bg-down/10 text-down",
            )}
          >
            {changeLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto">
          <Stat label="Turnover" value={snapshot.turnover} />
          <Stat label="Foreign Flow" value={snapshot.foreignFlow} tone={snapshot.foreignFlow.startsWith("+") ? "up" : "down"} />
          <Stat label="Adv / Dec" value={`${snapshot.advancers} / ${snapshot.decliners}`} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          tone === "up" ? "text-accent" : tone === "down" ? "text-down" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
