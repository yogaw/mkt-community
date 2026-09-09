"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button, ButtonLink } from "@/components/ui/button";
import { PlatformBadge } from "@/components/ui/platform-badge";
import type { UpcomingSessionDto } from "@/features/live-sessions/live-session-types";
import { formatSessionSchedule } from "@/lib/datetime/format";

interface UpcomingLiveProps {
  session: UpcomingSessionDto;
}

const LIVE_SESSION_DESCRIPTION = "Discussing market direction, stocks in focus and member Q&A.";

function formatCountdown(diffMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function googleCalendarUrl(session: UpcomingSessionDto): string {
  const start = new Date(session.scheduledAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${stamp(start)}/${stamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function UpcomingLive({ session }: UpcomingLiveProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Defer the first read so server and client markup stay consistent.
      await Promise.resolve();
      if (!cancelled) {
        setCountdown(formatCountdown(new Date(session.scheduledAt).getTime() - Date.now()));
      }
    })();

    const interval = setInterval(() => {
      setCountdown(formatCountdown(new Date(session.scheduledAt).getTime() - Date.now()));
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session.scheduledAt]);

  return (
    <section aria-label="Upcoming live session">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Upcoming Live</h2>
      <div className="mt-4 rounded-2xl border border-edge bg-panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <Image
            src="/avatar-placeholder.svg"
            alt="Session host"
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-full border border-edge"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-down">
                <span className="h-1.5 w-1.5 rounded-full bg-down" />
                Upcoming Live
              </span>
              <PlatformBadge label={session.platformLabel} />
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">{session.title}</h3>
            <p className="mt-1 text-sm font-medium text-accent">{formatSessionSchedule(session.scheduledAt)}</p>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">{LIVE_SESSION_DESCRIPTION}</p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
            {countdown ? (
              <p className="text-sm text-ink-faint">
                Starts in <span className="font-semibold text-ink">{countdown}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href={googleCalendarUrl(session)}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                className="w-auto px-5"
              >
                Add to Calendar
              </ButtonLink>
              {session.joinUrl ? (
                <ButtonLink
                  href={session.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-auto px-5"
                >
                  Join Session
                </ButtonLink>
              ) : (
                <Button disabled className="w-auto px-5">
                  Join Session
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
