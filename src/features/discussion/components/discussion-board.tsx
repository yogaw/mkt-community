"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getToken, isStoredUserAdmin } from "@/lib/auth/token-storage";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeTime } from "@/lib/datetime/format";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import type { PaginationMeta } from "@/lib/api/pagination";
import {
  CATEGORY_STYLE,
  formatViews,
  pluralize,
} from "@/features/discussion/discussion-display";
import {
  CATEGORY_LABEL,
  DISCUSSION_CATEGORIES,
  type DiscussionCategory,
  type DiscussionOverviewDto,
  type ThreadDetailDto,
  type ThreadSummaryDto,
} from "@/features/discussion/discussion-types";
import { CategoryCards } from "./category-cards";
import { CategoryIcon } from "./category-icon";
import { CommunityRules } from "./community-rules";
import { TopContributors } from "./top-contributors";

const SEARCH_DEBOUNCE_MS = 300;

type Status = "loading" | "ready" | "error";
type Sort = "active" | "newest" | "discussed" | "viewed";

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: "active", label: "Recently active" },
  { value: "newest", label: "Latest" },
  { value: "discussed", label: "Most discussed" },
  { value: "viewed", label: "Most viewed" },
];

const controlClass =
  "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

const EMPTY_OVERVIEW: DiscussionOverviewDto = {
  categories: DISCUSSION_CATEGORIES.map((category) => ({ category, threadCount: 0 })),
  contributors: [],
};

interface ListBody {
  data: ThreadSummaryDto[];
  pagination: PaginationMeta;
  overview: DiscussionOverviewDto;
}

/** The session cannot change role without a fresh sign-in. */
function subscribeToSession(): () => void {
  return () => {};
}

export function DiscussionBoard() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<Sort>("active");
  const [category, setCategory] = useState<DiscussionCategory | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [openThread, setOpenThread] = useState<ThreadDetailDto | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const debouncedRef = useRef("");

  const isAdmin = useSyncExternalStore(subscribeToSession, isStoredUserAdmin, () => false);

  /*
   * The request is identified by what it asks for, and the answer carries that
   * identity back. Loading is then something we read off the pair rather than
   * a flag an effect has to set going in and clear on every way out.
   */
  const request = `${sort}|${category ?? ""}|${debouncedSearch}|${reloadKey}`;
  const [loaded, setLoaded] = useState<{ request: string; body: ListBody } | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);

  const body = loaded?.request === request ? loaded.body : null;
  const status: Status =
    body !== null ? "ready" : failedRequest === request ? "error" : "loading";

  // The counts keep showing while a filtered request is in flight, so the row
  // of cards does not blink empty every time somebody types in the search box.
  const overview = loaded?.body.overview ?? EMPTY_OVERVIEW;
  const threads = body?.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== debouncedRef.current) {
        debouncedRef.current = search;
        setDebouncedSearch(search.trim());
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const query = new URLSearchParams({ sort });
      if (category) {
        query.set("category", category);
      }
      if (debouncedSearch) {
        query.set("search", debouncedSearch);
      }

      const result = await authedFetch<ListBody>(`/api/v1/discussions?${query.toString()}`);
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome !== "loaded") {
        setFailedRequest(request);
        return;
      }
      setLoaded({ request, body: result.body });
    })();

    return () => {
      cancelled = true;
    };
  }, [sort, category, debouncedSearch, request, router]);

  // A find over at most a page of threads; memoising it would cost more than
  // it saves and would need `threads` to be stable to be correct at all.
  const pinnedThreadId = threads.find((thread) => thread.isPinned)?.id ?? null;

  async function openThreadById(id: string) {
    const result = await authedFetch<{ data: ThreadDetailDto }>(`/api/v1/discussions/${id}`);
    if (result.outcome === "unauthenticated") {
      clearSession();
      router.replace("/login");
      return;
    }
    if (result.outcome === "loaded") {
      setOpenThread(result.body.data);
    }
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  const activeLabel = category === null ? "Latest Discussions" : CATEGORY_LABEL[category];

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Curated conversations to help you become a better investor. Share the reasoning, not
          just the ticker.
        </p>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search discussions..."
              aria-label="Search discussions"
              className="py-2 text-sm"
            />
          </div>
          <div className="shrink-0">
            <Button onClick={() => setIsComposeOpen(true)} className="px-4">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New Thread
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <CategoryCards categories={overview.categories} selected={category} onSelect={setCategory} />
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <section className="min-w-0 rounded-xl border border-edge bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
            <h2 className="text-base font-semibold text-ink">{activeLabel}</h2>
            <label className="flex shrink-0 items-center gap-2 text-sm text-ink-faint">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="rounded-lg border border-edge bg-panel-raised px-2.5 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {status === "loading" ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className="p-10 text-center">
              <p className="text-sm text-ink-muted">We could not load the discussions.</p>
              <Button onClick={refresh} className="mx-auto mt-4 w-auto px-6">
                Try Again
              </Button>
            </div>
          ) : null}

          {status === "ready" && threads.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={category === null ? "No threads yet" : `Nothing in ${CATEGORY_LABEL[category]} yet`}
                description="Start the first one and get the conversation going."
                action={
                  <Button onClick={() => setIsComposeOpen(true)} className="w-auto px-6">
                    New Thread
                  </Button>
                }
              />
            </div>
          ) : null}

          {status === "ready" && threads.length > 0 ? (
            <ul className="divide-y divide-edge">
              {threads.map((thread) => {
                const style = CATEGORY_STYLE[thread.category];
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void openThreadById(thread.id)}
                      className="flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-panel-raised/50"
                    >
                      <span
                        className={cn(
                          "hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg sm:flex",
                          style.tint,
                        )}
                      >
                        <CategoryIcon category={thread.category} className="h-7 w-7" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">{thread.title}</span>
                            <span className="mt-0.5 block truncate text-sm text-ink-muted">
                              {thread.snippet}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {thread.isPinned ? (
                              <span
                                title="Pinned"
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-down/10 text-down"
                              >
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                  <path d="M9.8 1.4a1 1 0 011.4 0l3.4 3.4a1 1 0 010 1.4l-.7.7a1 1 0 01-1.2.2l-1.3 1.9.6.6a1 1 0 010 1.4l-.7.7a1 1 0 01-1.4 0L7.1 9.4l-4.4 4.4a.7.7 0 01-1-1l4.4-4.4-2.3-2.3a1 1 0 010-1.4l.7-.7a1 1 0 011.4 0l.6.6 1.9-1.3a1 1 0 01.2-1.2l.7-.7z" />
                                </svg>
                                <span className="sr-only">Pinned</span>
                              </span>
                            ) : null}
                            {thread.isLocked ? (
                              <span className="rounded-full bg-panel-raised px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
                                Locked
                              </span>
                            ) : null}
                          </span>
                        </span>

                        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              style.chip,
                            )}
                          >
                            {style.label}
                          </span>
                          {thread.ticker ? (
                            <span className="rounded-full bg-panel-raised px-2.5 py-1 text-xs font-semibold text-ink-muted">
                              {thread.ticker}
                            </span>
                          ) : null}

                          <span className="flex items-center gap-1 text-xs text-ink-faint" title={pluralize(thread.replyCount, "reply", "replies")}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                              <path d="M2.5 4.2a1.2 1.2 0 011.2-1.2h8.6a1.2 1.2 0 011.2 1.2v5.4a1.2 1.2 0 01-1.2 1.2H6.4L3.4 13.3a.4.4 0 01-.64-.32V4.2z" strokeLinejoin="round" />
                            </svg>
                            {thread.replyCount}
                          </span>

                          <span className="flex items-center gap-1 text-xs text-ink-faint" title={`${thread.viewCount.toLocaleString("en-US")} views`}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                              <path d="M1.4 8s2.5-4.3 6.6-4.3S14.6 8 14.6 8s-2.5 4.3-6.6 4.3S1.4 8 1.4 8z" />
                              <circle cx="8" cy="8" r="1.9" />
                            </svg>
                            {formatViews(thread.viewCount)}
                          </span>

                          <span className="ml-auto text-xs text-ink-faint">
                            {formatDate(thread.createdAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {body && body.pagination.totalItems > threads.length ? (
            <p className="border-t border-edge px-5 py-3 text-xs text-ink-faint">
              Showing {threads.length} of {body.pagination.totalItems} threads.
            </p>
          ) : null}
        </section>

        <aside className="space-y-4">
          <CommunityRules
            onOpenGuidelines={() => {
              if (pinnedThreadId) {
                void openThreadById(pinnedThreadId);
              }
            }}
          />
          <TopContributors contributors={overview.contributors} />
        </aside>
      </div>

      <ComposeThreadModal
        open={isComposeOpen}
        defaultCategory={category}
        onClose={() => setIsComposeOpen(false)}
        onCreated={(thread) => {
          setIsComposeOpen(false);
          setOpenThread(thread);
          refresh();
        }}
      />

      <ThreadModal
        thread={openThread}
        isAdmin={isAdmin}
        onClose={() => setOpenThread(null)}
        onChanged={(thread) => {
          setOpenThread(thread);
          refresh();
        }}
        onDeleted={() => {
          setOpenThread(null);
          refresh();
        }}
      />
    </main>
  );
}

function ComposeThreadModal({
  open,
  defaultCategory,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** Whatever room the board is filtered to, so posting lands where you are. */
  defaultCategory: DiscussionCategory | null;
  onClose: () => void;
  onCreated: (thread: ThreadDetailDto) => void;
}) {
  const [title, setTitle] = useState("");
  const [ticker, setTicker] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<DiscussionCategory>(
    defaultCategory ?? "MARKET_OUTLOOK",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setTicker("");
    setBody("");
    setCategory(defaultCategory ?? "MARKET_OUTLOOK");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title.trim().length < 4) {
      setError("Give the thread a title of at least four characters.");
      return;
    }
    if (body.trim().length < 10) {
      setError("Write at least a sentence so people have something to respond to.");
      return;
    }

    const token = getToken();
    if (!token) {
      setError(humanizeErrorCode("general.error.unauthorized"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          body,
          category,
          ticker: ticker.trim() === "" ? null : ticker.trim(),
        }),
      });
      if (!response.ok) {
        setError(humanizeErrorCode("general.error.validation"));
        return;
      }
      const created = (await response.json()) as { data: ThreadDetailDto };
      reset();
      onCreated(created.data);
    } catch {
      setError(humanizeErrorCode("general.error.server_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          reset();
          onClose();
        }
      }}
      title="New Thread"
      description="Start a conversation with the community."
    >
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5" noValidate>
        {error ? <Alert>{error}</Alert> : null}

        <Input
          label="Title"
          placeholder="What do you want to talk about?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
        />
        <div className="space-y-1.5">
          <label htmlFor="thread-category" className="block text-sm font-medium text-ink-muted">
            Category
          </label>
          <select
            id="thread-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DiscussionCategory)}
            className={controlClass}
          >
            {DISCUSSION_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Ticker (optional)"
          placeholder="CUAN"
          value={ticker}
          onChange={(event) => setTicker(event.target.value.toUpperCase())}
          maxLength={10}
        />
        <div className="space-y-1.5">
          <label htmlFor="thread-body" className="block text-sm font-medium text-ink-muted">
            Post
          </label>
          <textarea
            id="thread-body"
            rows={7}
            className={cn(controlClass, "resize-y")}
            placeholder="Share your reasoning, not just the ticker."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-edge bg-panel px-5 py-4">
          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="px-5"
              disabled={isSubmitting}
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
          </div>
          <div className="shrink-0">
            <Button type="submit" className="px-5" disabled={isSubmitting}>
              {isSubmitting ? "Posting…" : "Post Thread"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ThreadModal({
  thread,
  isAdmin,
  onClose,
  onChanged,
  onDeleted,
}: {
  thread: ThreadDetailDto | null;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: (thread: ThreadDetailDto) => void;
  onDeleted: () => void;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(path: string, method: string, payload?: unknown) {
    const token = getToken();
    if (!token) {
      setError(humanizeErrorCode("general.error.unauthorized"));
      return null;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(
          response.status === 403
            ? humanizeErrorCode("general.error.forbidden")
            : humanizeErrorCode("general.error.server_error"),
        );
        return null;
      }
      return (await response.json()) as { data: ThreadDetailDto };
    } catch {
      setError(humanizeErrorCode("general.error.server_error"));
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  if (thread === null) {
    return null;
  }

  return (
    <Modal open onClose={onClose} title={thread.title} description={`${thread.author.name}${thread.author.isAdmin ? " · Admin" : ""} · ${formatRelativeTime(thread.createdAt)}`}>
      <div className="space-y-5 px-5 py-5">
        {error ? <Alert>{error}</Alert> : null}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              CATEGORY_STYLE[thread.category].chip,
            )}
          >
            {CATEGORY_STYLE[thread.category].label}
          </span>
          {thread.ticker ? (
            <span className="rounded-full bg-panel-raised px-2.5 py-1 text-xs font-semibold text-ink-muted">
              {thread.ticker}
            </span>
          ) : null}
          {thread.isPinned ? (
            <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">Pinned</span>
          ) : null}
          {thread.isLocked ? (
            <span className="rounded-full bg-panel-raised px-2.5 py-1 text-xs font-semibold text-ink-faint">
              Locked
            </span>
          ) : null}
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{thread.body}</p>

        <p className="text-xs text-ink-faint">
          {formatViews(thread.viewCount)} {thread.viewCount === 1 ? "view" : "views"}
        </p>

        <div className="border-t border-edge pt-4">
          <h3 className="text-sm font-semibold text-ink">
            {thread.reply.length} {thread.reply.length === 1 ? "Reply" : "Replies"}
          </h3>
          {thread.reply.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {thread.reply.map((reply) => (
                <li key={reply.id} className="rounded-lg border border-edge bg-panel-raised/40 p-3">
                  <p className="text-xs text-ink-faint">
                    {reply.author.name}
                    {reply.author.isAdmin ? " · Admin" : ""} · {formatRelativeTime(reply.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                    {reply.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">Nobody has replied yet.</p>
          )}
        </div>

        {thread.isLocked ? (
          <p className="rounded-lg border border-edge bg-panel-raised/50 px-3 py-2.5 text-sm text-ink-muted">
            This thread is locked. It stays readable, but no new replies can be added.
          </p>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (replyBody.trim().length === 0) {
                return;
              }
              const result = await send(`/api/v1/discussions/${thread.id}/replies`, "POST", {
                body: replyBody,
              });
              if (result) {
                setReplyBody("");
                onChanged(result.data);
              }
            }}
            className="space-y-2"
          >
            <label htmlFor="reply-body" className="block text-sm font-medium text-ink-muted">
              Your reply
            </label>
            <textarea
              id="reply-body"
              rows={3}
              className={cn(controlClass, "resize-y")}
              placeholder="Add to the conversation…"
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
            />
            <div className="flex justify-end">
              <div className="shrink-0">
                <Button type="submit" className="px-5" disabled={isBusy || replyBody.trim() === ""}>
                  {isBusy ? "Posting…" : "Reply"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {isAdmin || thread.isMine ? (
          <div className="flex flex-wrap gap-2 border-t border-edge pt-4">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const result = await send(`/api/v1/discussions/${thread.id}/moderate`, "PATCH", {
                      isPinned: !thread.isPinned,
                    });
                    if (result) onChanged(result.data);
                  }}
                  className="rounded-lg border border-edge bg-panel-raised px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  {thread.isPinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const result = await send(`/api/v1/discussions/${thread.id}/moderate`, "PATCH", {
                      isLocked: !thread.isLocked,
                    });
                    if (result) onChanged(result.data);
                  }}
                  className="rounded-lg border border-edge bg-panel-raised px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  {thread.isLocked ? "Unlock" : "Lock"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                const token = getToken();
                if (!token) return;
                setIsBusy(true);
                const response = await fetch(`/api/v1/discussions/${thread.id}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                setIsBusy(false);
                if (response.ok) onDeleted();
              }}
              className="rounded-lg border border-edge bg-panel-raised px-3 py-2 text-sm font-medium text-down hover:border-down/50 disabled:opacity-50"
            >
              Delete thread
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
