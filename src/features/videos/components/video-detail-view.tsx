"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/videos/video-player";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession } from "@/lib/auth/token-storage";
import { authedFetch } from "@/lib/api/authed-fetch";
import { formatDate, formatDuration } from "@/lib/datetime/format";
import type { VideoDetailDto } from "../video-types";

type Status = "loading" | "ready" | "not-found" | "error";

export function VideoDetailView({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetailDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: VideoDetailDto }>(`/api/v1/videos/${videoId}`);
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
      setVideo(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId, reloadKey, router]);

  function handleRetry() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  return (
    <main className="mx-auto w-full max-w-[840px] px-4 py-8 sm:px-6">
      <Link
        href="/videos"
        className="mb-4 inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        Back to Videos
      </Link>

      {status === "loading" ? (
        <div className="space-y-4" aria-label="Loading video">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {status === "not-found" ? (
        <EmptyState
          title="Video not found"
          description="This video may have been removed."
          action={
            <ButtonLink href="/videos" className="w-auto px-6">
              Back to Videos
            </ButtonLink>
          }
        />
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load this video. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && video ? (
        <article>
          <VideoPlayer
            provider={video.provider}
            embedUrl={video.embedUrl}
            thumbnailUrl={video.thumbnailUrl}
            title={video.title}
          />
          <h1 className="mt-5 text-2xl font-semibold text-ink">{video.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-faint">
            <span>{formatDate(video.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(video.durationSeconds)}</span>
            <span aria-hidden="true">·</span>
            <CategoryBadge label={video.category.name} />
          </div>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {video.description}
          </p>
        </article>
      ) : null}
    </main>
  );
}
