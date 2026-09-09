import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { briefingTickers } from "@/features/home/market-data";
import type { FeaturedContent } from "@/features/home/home-types";
import { formatDate, formatDuration } from "@/lib/datetime/format";

interface BriefingHeroProps {
  featured: FeaturedContent;
}

export function BriefingHero({ featured }: BriefingHeroProps) {
  const isVideo = featured.kind === "video";
  const href =
    featured.kind === "video"
      ? `/videos/${featured.item.id}`
      : featured.kind === "news"
        ? `/updates/news/${featured.item.id}`
        : `/updates/announcements/${featured.item.id}`;

  const description =
    featured.kind === "video"
      ? featured.item.shortDescription
      : featured.kind === "news"
        ? featured.item.summary
        : featured.item.snippet;

  return (
    <section className="overflow-hidden rounded-2xl border border-edge bg-panel" aria-label="Today's briefing">
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Today&apos;s Briefing</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{featured.item.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted sm:text-base">{description}</p>

          {isVideo ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {briefingTickers.map((ticker) => (
                <span
                  key={ticker}
                  className="rounded-md border border-edge bg-panel-raised px-2 py-1 text-xs font-semibold text-ink-muted"
                >
                  {ticker}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-4 text-xs text-ink-faint">
            {isVideo
              ? `${formatDuration(featured.item.durationSeconds)} watch · ${formatDate(featured.item.publishedAt)}`
              : formatDate(featured.item.publishedAt)}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink href={href} className="w-auto px-5">
              {isVideo ? "Watch Briefing" : featured.ctaLabel}
            </ButtonLink>
            <Link href={href} className="text-sm font-semibold text-accent transition-colors hover:text-accent-strong">
              {isVideo ? "Read Summary" : "View Details"} &rarr;
            </Link>
          </div>
        </div>

        {isVideo ? (
          <div className="relative min-h-48 border-t border-edge lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              src={featured.item.thumbnailUrl}
              alt={featured.item.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="hidden items-center justify-center border-l border-edge bg-panel-raised lg:flex">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{featured.kind}</span>
          </div>
        )}
      </div>
    </section>
  );
}
