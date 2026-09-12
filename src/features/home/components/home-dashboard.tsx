"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefingHero } from "@/components/home/briefing-hero";
import { MarketOverview } from "@/features/market-overview/components/market-overview";
import { SectorPulse } from "@/components/home/sector-pulse";
import { StocksInFocus } from "@/components/home/stocks-in-focus";
import { UpcomingLive } from "@/components/home/upcoming-live";
import { WhatMattersToday } from "@/components/home/what-matters";
import { WelcomeHeader } from "@/components/home/welcome-header";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession, getStoredUser, getToken } from "@/lib/auth/token-storage";
import { getGreeting } from "@/lib/datetime/format";
import type { HomeFeed } from "../home-types";

type DashboardState = "loading" | "ready" | "error";

interface DashboardProfile {
  greeting: string;
  name: string;
}

type FeedResult =
  | { outcome: "unauthenticated" }
  | { outcome: "failed" }
  | { outcome: "loaded"; feed: HomeFeed; profile: DashboardProfile };

const insightsGridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

async function fetchHomeFeed(): Promise<FeedResult> {
  const token = getToken();
  if (!token) {
    return { outcome: "unauthenticated" };
  }

  try {
    const response = await fetch("/api/v1/home", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      return { outcome: "unauthenticated" };
    }
    if (!response.ok) {
      return { outcome: "failed" };
    }

    const feed = (await response.json()) as HomeFeed;
    const profile = { greeting: getGreeting(new Date()), name: getStoredUser()?.name ?? "" };
    return { outcome: "loaded", feed, profile };
  } catch {
    return { outcome: "failed" };
  }
}

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<DashboardProfile>({ greeting: "", name: "" });
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [state, setState] = useState<DashboardState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchHomeFeed();
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome === "failed") {
        setState("error");
        return;
      }
      setFeed(result.feed);
      setProfile(result.profile);
      setState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  function handleRetry() {
    setState("loading");
    setReloadKey((key) => key + 1);
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
      {state === "loading" ? <DashboardSkeleton /> : null}

      {state === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load your dashboard. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {state === "ready" && feed ? (
        <div className="space-y-10">
          <WelcomeHeader greeting={profile.greeting} name={profile.name} />

          <MarketOverview />

          {feed.featuredContent ? <BriefingHero featured={feed.featuredContent} /> : null}

          <WhatMattersToday />

          <StocksInFocus />

          <SectorPulse />

          {feed.upcomingSession ? <UpcomingLive session={feed.upcomingSession} /> : null}

          <section>
            <SectionHeader title="Latest Market Insights" actionLabel="View All Videos" actionHref="/videos" />
            {feed.latestVideos.length > 0 ? (
              <div className={insightsGridClass}>
                {feed.latestVideos.map((video) => (
                  <VideoCard key={video.id} video={video} typeLabel="Video" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No insights published yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10" aria-label="Loading dashboard">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className={insightsGridClass}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
