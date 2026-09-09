import { sectorPulse, type SectorView } from "@/features/home/market-data";
import { cn } from "@/lib/cn";

const viewTone: Record<SectorView, string> = {
  Positive: "border-accent/30 bg-accent/10 text-accent",
  Neutral: "border-edge bg-panel-raised text-ink-muted",
  Watch: "bg-amber-400/10 text-amber-300 border-amber-400/30",
};

export function SectorPulse() {
  return (
    <section aria-label="Sector pulse">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Sector Pulse</h2>
      <div className="mt-4 rounded-xl border border-edge bg-panel px-5 py-2 sm:px-6">
        <ul className="divide-y divide-edge">
          {sectorPulse.map((sector) => {
            const isUp = sector.changePercent >= 0;
            return (
              <li key={sector.sector} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-ink">{sector.sector}</span>
                <div className="flex items-center gap-4">
                  <span className={cn("text-sm font-semibold tabular-nums", isUp ? "text-accent" : "text-down")}>
                    {isUp ? "+" : ""}
                    {sector.changePercent.toFixed(2)}%
                  </span>
                  <span
                    className={cn(
                      "w-20 justify-center rounded-full border px-2 py-0.5 text-center text-xs font-semibold",
                      viewTone[sector.view],
                    )}
                  >
                    {sector.view}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
