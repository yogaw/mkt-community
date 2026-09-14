"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeTime } from "@/lib/datetime/format";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { NewsSummaryDto } from "@/features/updates/update-types";
import {
  calendarKindLabel,
  calendarKindTone,
  disclosureKindLabel,
  disclosureKindTone,
} from "@/features/news/news-display";
import type { CalendarEventDto, IdxDisclosureDto } from "@/features/news/news-types";
import { EbookLibrary } from "@/features/ebooks/components/ebook-library";

const SEARCH_DEBOUNCE_MS = 300;

type Section = "articles" | "disclosures" | "calendar" | "ebooks";
type Status = "loading" | "ready" | "error";

const sections: Array<{ value: Section; label: string }> = [
  { value: "articles", label: "Media Articles" },
  { value: "disclosures", label: "IDX Disclosures" },
  { value: "calendar", label: "Calendar" },
  { value: "ebooks", label: "E-books" },
];

interface ListBody<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function NewsView() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("articles");

  const [articles, setArticles] = useState<NewsSummaryDto[]>([]);
  const [disclosures, setDisclosures] = useState<IdxDisclosureDto[]>([]);
  const [events, setEvents] = useState<CalendarEventDto[]>([]);

  const [status, setStatus] = useState<Status>("loading");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [window, setWindow] = useState<"upcoming" | "past">("upcoming");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    if (section === "ebooks") {
      return;
    }

    void (async () => {
      const path =
        section === "articles"
          ? "/api/v1/news?page=1"
          : section === "disclosures"
            ? `/api/v1/disclosures?page=1${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
            : `/api/v1/calendar?window=${window}`;

      const result = await authedFetch<ListBody<NewsSummaryDto | IdxDisclosureDto | CalendarEventDto>>(path);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome !== "loaded") {
        setStatus("error");
        return;
      }

      if (section === "articles") {
        setArticles(result.body.data as NewsSummaryDto[]);
      } else if (section === "disclosures") {
        setDisclosures(result.body.data as IdxDisclosureDto[]);
      } else {
        setEvents(result.body.data as CalendarEventDto[]);
      }
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [section, debouncedSearch, window, reloadKey, router]);

  function changeSection(next: Section) {
    if (next === section) {
      return;
    }
    setStatus("loading");
    setSection(next);
    setSearch("");
    setDebouncedSearch("");
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <p className="max-w-2xl text-sm text-ink-muted">
        What moved, what was filed, and what is coming — market coverage, company disclosures to
        the exchange, and the dates worth having in your diary.
      </p>

      <div className="mt-6 border-b border-edge">
        <div role="tablist" aria-label="News sections" className="flex gap-1 overflow-x-auto">
          {sections.map((item) => {
            const isActive = item.value === section;
            return (
              <button
                key={item.value}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => changeSection(item.value)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {section === "ebooks" ? (
        <div className="mt-6">
          <EbookLibrary
            onUnauthenticated={() => {
              clearSession();
              router.replace("/login");
            }}
          />
        </div>
      ) : null}

      {section === "disclosures" ? (
        <div className="mt-5 max-w-sm">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticker, company or title..."
            aria-label="Search disclosures"
          />
        </div>
      ) : null}

      {section === "calendar" ? (
        <div className="mt-5 flex gap-2">
          {(["upcoming", "past"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={window === value}
              onClick={() => {
                if (window !== value) {
                  setStatus("loading");
                  setWindow(value);
                }
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                window === value
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-edge bg-panel text-ink-muted hover:text-ink",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}

      <div className={section === "ebooks" ? "hidden" : "mt-6"}>
        {status === "loading" ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-edge bg-panel p-10 text-center">
            <p className="text-sm text-ink-muted">We could not load this section. Please try again.</p>
            <Button
              onClick={() => {
                setStatus("loading");
                setReloadKey((key) => key + 1);
              }}
              className="mx-auto mt-4 w-auto px-6"
            >
              Try Again
            </Button>
          </div>
        ) : null}

        {status === "ready" && section === "articles" ? (
          <ArticleList articles={articles} />
        ) : null}
        {status === "ready" && section === "disclosures" ? (
          <DisclosureList disclosures={disclosures} />
        ) : null}
        {status === "ready" && section === "calendar" ? (
          <CalendarList events={events} window={window} />
        ) : null}
      </div>
    </main>
  );
}

function ArticleList({ articles }: { articles: NewsSummaryDto[] }) {
  if (articles.length === 0) {
    return <EmptyState title="No articles yet" description="Market coverage will appear here." />;
  }

  return (
    <ul className="space-y-3">
      {articles.map((article) => (
        <li key={article.id}>
          <Link
            href={`/updates/news/${article.id}`}
            className="block rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-ink-faint"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-panel-raised px-2.5 py-1 text-xs font-semibold text-accent">
                {article.category.name}
              </span>
              <span className="text-xs text-ink-faint">{formatRelativeTime(article.publishedAt)}</span>
            </div>
            <h3 className="mt-2 font-semibold text-ink">{article.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{article.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DisclosureList({ disclosures }: { disclosures: IdxDisclosureDto[] }) {
  if (disclosures.length === 0) {
    return (
      <EmptyState
        title="No disclosures found"
        description="Try a different ticker or company name."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {disclosures.map((disclosure) => (
        <li key={disclosure.id} className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{disclosure.ticker}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                disclosureKindTone[disclosure.kind],
              )}
            >
              {disclosureKindLabel[disclosure.kind]}
            </span>
            <span className="text-xs text-ink-faint">{formatDate(disclosure.disclosedAt)}</span>
          </div>
          <h3 className="mt-2 font-semibold text-ink">{disclosure.title}</h3>
          <p className="mt-0.5 text-xs text-ink-faint">{disclosure.companyName}</p>
          {disclosure.summary ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{disclosure.summary}</p>
          ) : null}
          {disclosure.documentUrl ? (
            <a
              href={disclosure.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-strong"
            >
              Open filing &rarr;
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CalendarList({
  events,
  window,
}: {
  events: CalendarEventDto[];
  window: "upcoming" | "past";
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title={window === "upcoming" ? "Nothing scheduled" : "No past events"}
        description={
          window === "upcoming"
            ? "Upcoming earnings, dividends and meetings will appear here."
            : "Events move here once their date has passed."
        }
      />
    );
  }

  // Grouped up front rather than tracked through the render, so nothing mutates
  // while rendering. Events arrive already ordered, so one pass is enough.
  const groups: Array<{ label: string; events: CalendarEventDto[] }> = [];
  for (const event of events) {
    const label = formatDate(event.eventDate);
    const current = groups.at(-1);
    if (current?.label === label) {
      current.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {group.label}
          </h3>
          <ul className="space-y-2">
            {group.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-edge bg-panel p-4"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    calendarKindTone[event.kind],
                  )}
                >
                  {calendarKindLabel[event.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {event.ticker ? (
                      <span className="mr-2 font-semibold text-accent">{event.ticker}</span>
                    ) : null}
                    {event.title}
                  </p>
                  {event.detail ? (
                    <p className="mt-0.5 text-sm text-ink-muted">{event.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
