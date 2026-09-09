"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArticleBody } from "@/components/updates/article-body";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeBadge } from "@/components/ui/type-badge";
import { clearSession } from "@/lib/auth/token-storage";
import { authedFetch } from "@/lib/api/authed-fetch";
import { formatDate, formatRelativeTime } from "@/lib/datetime/format";
import type { AnnouncementDetailDto } from "../update-types";

type Status = "loading" | "ready" | "not-found" | "error";

export function AnnouncementDetailView({ announcementId }: { announcementId: string }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<AnnouncementDetailDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: AnnouncementDetailDto }>(
        `/api/v1/announcements/${announcementId}`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome === "not-found") {
        setStatus("not-found");
        return;
      }
      if (result.outcome === "failed") {
        setStatus("error");
        return;
      }
      setAnnouncement(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [announcementId, reloadKey, router]);

  function handleRetry() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
      <Link
        href="/updates"
        className="mb-4 inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        Back to Updates
      </Link>

      {status === "loading" ? (
        <div className="space-y-4" aria-label="Loading announcement">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ) : null}

      {status === "not-found" ? (
        <EmptyState
          title="Announcement not found"
          description="This announcement may have been removed."
          action={
            <ButtonLink href="/updates" className="w-auto px-6">
              Back to Updates
            </ButtonLink>
          }
        />
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load this announcement. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && announcement ? (
        <article>
          <TypeBadge label="Announcement" />
          <h1 className="mt-3 text-2xl font-semibold text-ink">{announcement.title}</h1>
          <p className="mt-2 text-sm text-ink-faint">
            {formatDate(announcement.publishedAt)} · {formatRelativeTime(announcement.publishedAt)}
          </p>
          <div className="mt-6">
            <ArticleBody content={announcement.content} />
          </div>
          {announcement.ctaLabel && announcement.ctaUrl ? (
            <ButtonLink
              href={announcement.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 sm:w-auto"
            >
              {announcement.ctaLabel}
            </ButtonLink>
          ) : null}
        </article>
      ) : null}
    </main>
  );
}
