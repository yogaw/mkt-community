import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SignalStatsDto } from "@/features/signals/signal-types";

interface StatCard {
  label: string;
  value: string;
  hint: string;
  tone: string;
  icon: ReactNode;
}

function toCards(stats: SignalStatsDto): StatCard[] {
  return [
    {
      label: "Active Signals",
      value: String(stats.activeCount),
      hint: "Currently open trade ideas",
      tone: "bg-accent/10 text-accent",
      icon: <TrendIcon />,
    },
    {
      label: "Watchlist",
      value: String(stats.watchlistCount),
      hint: "Signals you are following",
      tone: "bg-info/10 text-info",
      icon: <EyeIcon />,
    },
    {
      label: "Target Hit (This Week)",
      value: String(stats.targetHitThisWeek),
      hint: "Targets reached in the last 7 days",
      tone: "bg-accent/10 text-accent",
      icon: <TargetIcon />,
    },
    {
      label: "Stop Loss (This Week)",
      value: String(stats.stopLossThisWeek),
      hint: "Stops taken in the last 7 days",
      tone: "bg-down/10 text-down",
      icon: <ShieldIcon />,
    },
    {
      label: "Win Rate",
      value: `${stats.winRatePercent}%`,
      hint: `${stats.wins} wins / ${stats.losses} losses`,
      tone: "bg-alt/10 text-alt",
      icon: <BarsIcon />,
    },
  ];
}

export function SignalStatCards({ stats }: { stats: SignalStatsDto }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {toCards(stats).map((card) => (
        <li
          key={card.label}
          className="rounded-xl border border-edge bg-panel p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-ink-muted">{card.label}</p>
            <span className={cn("shrink-0 rounded-lg p-1.5", card.tone)}>{card.icon}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{card.value}</p>
          <p className="mt-1 text-xs text-ink-faint">{card.hint}</p>
        </li>
      ))}
    </ul>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 11l3.5-3.5L8 10l5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4.5h3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 8S3.9 3.8 8 3.8 14.5 8 14.5 8 12.1 12.2 8 12.2 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.8l5.2 2.1v3.8c0 3-2.2 5.3-5.2 6.4-3-1.1-5.2-3.4-5.2-6.4V3.9L8 1.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13V9.5M8 13V4M13 13v-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
