"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { getToken } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/datetime/format";
import { ebookTagLabel, ebookTagTone, formatFileSize } from "@/features/ebooks/ebook-display";
import { EBOOK_TAGS, type EbookDto, type EbookTag } from "@/features/ebooks/ebook-types";

const SEARCH_DEBOUNCE_MS = 300;

type Status = "loading" | "ready" | "error";

interface EbookLibraryProps {
  onUnauthenticated: () => void;
}

export function EbookLibrary({ onUnauthenticated }: EbookLibraryProps) {
  const [ebooks, setEbooks] = useState<EbookDto[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [tag, setTag] = useState<EbookTag | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams();
      if (tag !== "all") {
        query.set("tag", tag);
      }
      if (debouncedSearch) {
        query.set("search", debouncedSearch);
      }
      const result = await authedFetch<{ data: EbookDto[] }>(`/api/v1/ebooks?${query.toString()}`);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        onUnauthenticated();
        return;
      }
      if (result.outcome !== "loaded") {
        setStatus("error");
        return;
      }
      setEbooks(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [tag, debouncedSearch, reloadKey, onUnauthenticated]);

  /**
   * The document route needs a bearer token, which a plain link cannot send.
   * So it is fetched, turned into a blob and opened — which also means the
   * member-only URL never becomes a shareable one.
   */
  async function openDocument(ebook: EbookDto) {
    const token = getToken();
    if (!token) {
      onUnauthenticated();
      return;
    }

    setOpeningId(ebook.id);
    try {
      const response = await fetch(ebook.downloadPath, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onUnauthenticated();
        return;
      }
      if (!response.ok) {
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener");
      // The tab keeps its own reference; releasing ours after a beat avoids
      // leaking one object URL per click.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-sm sm:flex-1">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, publisher or ticker..."
            aria-label="Search library"
          />
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {(["all", ...EBOOK_TAGS] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tag === value}
              onClick={() => {
                if (tag !== value) {
                  setStatus("loading");
                  setTag(value);
                }
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                tag === value
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-edge bg-panel text-ink-muted hover:text-ink",
              )}
            >
              {value === "all" ? "All" : ebookTagLabel[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {status === "loading" ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-edge bg-panel p-10 text-center">
            <p className="text-sm text-ink-muted">We could not load the library.</p>
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

        {status === "ready" && ebooks.length === 0 ? (
          <EmptyState
            title="Nothing in the library yet"
            description="Research reports and articles published here will appear in this list."
          />
        ) : null}

        {status === "ready" && ebooks.length > 0 ? (
          <>
            <ul className="space-y-3">
              {ebooks.map((ebook) => (
                <li key={ebook.id} className="rounded-xl border border-edge bg-panel p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        ebookTagTone[ebook.tag],
                      )}
                    >
                      {ebookTagLabel[ebook.tag]}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">{ebook.source}</span>
                    <span className="text-xs text-ink-faint">{formatDate(ebook.publishedAt)}</span>
                    <span className="text-xs text-ink-faint">
                      PDF · {formatFileSize(ebook.fileSizeBytes)}
                    </span>
                  </div>

                  <h3 className="mt-2 font-semibold text-ink">{ebook.title}</h3>
                  {ebook.author ? (
                    <p className="mt-0.5 text-xs text-ink-faint">{ebook.author}</p>
                  ) : null}
                  {ebook.summary ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{ebook.summary}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ebook.tickers.map((ticker) => (
                      <span
                        key={ticker}
                        className="rounded-full bg-panel-raised px-2 py-0.5 text-xs font-semibold text-accent"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 w-fit">
                    <Button
                      onClick={() => void openDocument(ebook)}
                      disabled={openingId === ebook.id}
                      variant="secondary"
                      className="px-4"
                    >
                      {openingId === ebook.id ? "Opening…" : "Open document"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Provenance travels with the list: these are third-party documents
                under their publishers' own terms. */}
            <p className="mt-4 rounded-lg border border-edge bg-panel-raised/40 px-4 py-3 text-xs text-ink-faint">
              Documents are published by the research houses named above and remain subject to
              their own terms. They are provided to members for information and are not
              investment advice.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
