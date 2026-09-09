"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArticleBody } from "@/components/updates/article-body";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession } from "@/lib/auth/token-storage";
import { authedFetch } from "@/lib/api/authed-fetch";
import { formatDate } from "@/lib/datetime/format";
import type { NewsDetailDto } from "../update-types";

type Status = "loading" | "ready" | "not-found" | "error";

export function NewsDetailView({ newsId }: { newsId: string }) {
  const router = useRouter();
  const [news, setNews] = useState<NewsDetailDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: NewsDetailDto }>(`/api/v1/news/${newsId}`);
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
      setNews(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [newsId, reloadKey, router]);

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
        <div className="space-y-4" aria-label="Loading article">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {status === "not-found" ? (
        <EmptyState
          title="News not found"
          description="This article may have been removed."
          action={
            <ButtonLink href="/updates" className="w-auto px-6">
              Back to Updates
            </ButtonLink>
          }
        />
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load this article. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && news ? (
        <article>
          {news.imageUrl ? (
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-panel-raised">
              <Image
                src={news.imageUrl}
                alt={news.title}
                fill
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          <CategoryBadge label={news.category.name} />
          <h1 className="mt-3 text-2xl font-semibold text-ink">{news.title}</h1>
          <p className="mt-2 text-sm text-ink-faint">{formatDate(news.publishedAt)}</p>
          <div className="mt-6">
            <ArticleBody content={news.content} />
          </div>
        </article>
      ) : null}
    </main>
  );
}
