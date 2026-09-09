"use client";

import { useEffect, useState } from "react";

const WIB_TIME_ZONE = "Asia/Jakarta";

type MarketStatus = "open" | "closed" | null;

function idxMarketStatus(date: Date): "open" | "closed" {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: WIB_TIME_ZONE,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  if (parts.weekday === "Sat" || parts.weekday === "Sun") {
    return "closed";
  }
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const morningOpen = minutes >= 9 * 60 && minutes < 12 * 60;
  const afternoonOpen = minutes >= 13 * 60 + 30 && minutes < 15 * 60 + 50;
  return morningOpen || afternoonOpen ? "open" : "closed";
}

interface WelcomeHeaderProps {
  greeting: string;
  name: string;
}

export function WelcomeHeader({ greeting, name }: WelcomeHeaderProps) {
  const [clock, setClock] = useState<{ dateLabel: string; status: MarketStatus }>({ dateLabel: "", status: null });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Defer the clock read so server and client markup stay consistent.
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      const now = new Date();
      const dateLabel = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: WIB_TIME_ZONE,
      }).format(now);
      setClock({ dateLabel, status: idxMarketStatus(now) });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const heading = greeting ? `${greeting}${name ? `, ${name}` : ""}` : "Welcome";

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{heading}</h1>
        {clock.dateLabel ? <p className="mt-1 text-sm text-ink-faint">{clock.dateLabel} · WIB</p> : null}
      </div>
      {clock.status ? (
        <span
          className="flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1 text-xs font-semibold text-ink-muted"
          aria-label={clock.status === "open" ? "IDX market open" : "IDX market closed"}
        >
          <span
            className={clock.status === "open" ? "h-1.5 w-1.5 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-ink-faint"}
          />
          {clock.status === "open" ? "Market Open" : "Market Closed"}
        </span>
      ) : null}
    </header>
  );
}
