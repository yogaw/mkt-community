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
import { formatRelativeTime } from "@/lib/datetime/format";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { ThreadDetailDto, ThreadSummaryDto } from "@/features/discussion/discussion-types";

const SEARCH_DEBOUNCE_MS = 300;

type Status = "loading" | "ready" | "error";
type Sort = "newest" | "active";

const controlClass =
  "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

/** The session cannot change role without a fresh sign-in. */
function subscribeToSession(): () => void {
  return () => {};
}

export function DiscussionBoard() {
  const router = useRouter();

  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<Sort>("active");
  const [reloadKey, setReloadKey] = useState(0);

  const [openThread, setOpenThread] = useState<ThreadDetailDto | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const debouncedRef = useRef("");

  const isAdmin = useSyncExternalStore(subscribeToSession, isStoredUserAdmin, () => false);

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
      if (debouncedSearch) {
        query.set("search", debouncedSearch);
      }
      const result = await authedFetch<{ data: ThreadSummaryDto[]; pagination: PaginationMeta }>(
        `/api/v1/discussions?${query.toString()}`,
      );
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
      setThreads(result.body.data);
      setPagination(result.body.pagination);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sort, reloadKey, router]);

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

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Where members work through ideas together. Share the reasoning, not just the ticker.
        </p>
        <div className="shrink-0">
          <Button onClick={() => setIsComposeOpen(true)} className="px-4">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New Thread
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-sm sm:flex-1">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search discussions..."
            aria-label="Search discussions"
          />
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {(["active", "newest"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                sort === value
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-edge bg-panel text-ink-muted hover:text-ink",
              )}
            >
              {value === "active" ? "Recently active" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {status === "loading" ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-edge bg-panel p-10 text-center">
            <p className="text-sm text-ink-muted">We could not load the discussions.</p>
            <Button onClick={refresh} className="mx-auto mt-4 w-auto px-6">
              Try Again
            </Button>
          </div>
        ) : null}

        {status === "ready" && threads.length === 0 ? (
          <EmptyState
            title="No threads yet"
            description="Start the first one and get the conversation going."
            action={
              <Button onClick={() => setIsComposeOpen(true)} className="w-auto px-6">
                New Thread
              </Button>
            }
          />
        ) : null}

        {status === "ready" && threads.length > 0 ? (
          <ul className="space-y-3">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => void openThreadById(thread.id)}
                  className="block w-full rounded-xl border border-edge bg-panel p-5 text-left transition-colors hover:border-ink-faint"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.isPinned ? (
                      <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
                        Pinned
                      </span>
                    ) : null}
                    {thread.isLocked ? (
                      <span className="rounded-full bg-panel-raised px-2.5 py-1 text-xs font-semibold text-ink-faint">
                        Locked
                      </span>
                    ) : null}
                    {thread.ticker ? (
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        {thread.ticker}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-semibold text-ink">{thread.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{thread.snippet}</p>
                  <p className="mt-3 text-xs text-ink-faint">
                    {thread.author.name}
                    {thread.author.isAdmin ? " · Admin" : ""} · {formatRelativeTime(thread.createdAt)}{" "}
                    · {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {pagination && pagination.totalItems > threads.length ? (
          <p className="mt-3 text-xs text-ink-faint">
            Showing {threads.length} of {pagination.totalItems} threads.
          </p>
        ) : null}
      </div>

      <ComposeThreadModal
        open={isComposeOpen}
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
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: ThreadDetailDto) => void;
}) {
  const [title, setTitle] = useState("");
  const [ticker, setTicker] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setTicker("");
    setBody("");
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
        body: JSON.stringify({ title, body, ticker: ticker.trim() === "" ? null : ticker.trim() }),
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
          {thread.ticker ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
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
