"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getStoredUser } from "@/lib/auth/token-storage";
import { CATEGORY_LABEL, type CommentDto, type ThreadDetailDto } from "@/features/discussion/discussion-types";
import { mutateThread, type MutationResult } from "@/features/discussion/discussion-api";
import { useIsAdmin } from "@/features/discussion/use-discussion-session";
import { DiscussionPost } from "./discussion-post";
import { DiscussionMeta } from "./discussion-meta";
import { DiscussionActions } from "./discussion-actions";
import { DiscussionAdminBar } from "./discussion-admin-bar";
import { CommentList } from "./comment-list";
import { CommentComposer } from "./comment-composer";
import { RelatedDiscussions } from "./related-discussions";
import { ThreadSkeleton } from "./discussion-skeletons";

type Status = "loading" | "ready" | "not-found" | "error";

export function DiscussionDetailPage({ discussionId }: { discussionId: string }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();

  const [thread, setThread] = useState<ThreadDetailDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("Share");

  const commentsRef = useRef<HTMLDivElement>(null);
  const viewerName = getStoredUser()?.name ?? "You";

  const goToLogin = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: ThreadDetailDto }>(
        `/api/v1/discussions/${discussionId}`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        goToLogin();
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
      setThread(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [discussionId, reloadKey, goToLogin]);

  /** Every mutation returns the whole thread, so state is replaced, not patched. */
  const apply = useCallback(
    async (
      scope: string,
      run: () => Promise<MutationResult>,
    ): Promise<boolean> => {
      setBusyId(scope);
      setErrorId(null);
      setErrorMessage(null);

      const result = await run();
      setBusyId(null);

      if (result.outcome === "unauthenticated") {
        goToLogin();
        return false;
      }
      if (result.outcome === "failed") {
        setErrorId(scope);
        setErrorMessage(result.message);
        return false;
      }
      setThread(result.thread);
      return true;
    },
    [goToLogin],
  );

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
        <ThreadSkeleton />
      </main>
    );
  }

  if (status === "not-found" || status === "error") {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
        <Link
          href="/discussion"
          className="mb-4 inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          &larr; Back to Discussions
        </Link>
        {status === "not-found" ? (
          <EmptyState
            title="This discussion is not available."
            description="It may have been removed, or the link may be wrong."
            action={
              <Button onClick={() => router.push("/discussion")} className="w-auto px-6">
                Browse Discussions
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="We could not load this discussion."
            description="The request did not come back. Nothing has been lost — try again."
            action={
              <Button onClick={() => setReloadKey((key) => key + 1)} className="w-auto px-6">
                Try Again
              </Button>
            }
          />
        )}
      </main>
    );
  }

  if (thread === null) {
    return null;
  }

  const threadBusy = busyId === "thread";

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-ink-faint">
          <li>
            <Link href="/discussion" className="transition-colors hover:text-ink">
              Discussions
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/discussion?category=${thread.category}`}
              className="transition-colors hover:text-ink"
            >
              {CATEGORY_LABEL[thread.category]}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {thread.title}
      </h1>

      <div className="mt-4">
        <DiscussionMeta thread={thread} />
      </div>

      {isAdmin ? (
        <div className="mt-4">
          <DiscussionAdminBar
            thread={thread}
            isBusy={threadBusy}
            onPatch={(changes) =>
              void apply("thread", () =>
                mutateThread(`/api/v1/discussions/${thread.id}`, "PATCH", changes),
              )
            }
            onDelete={() => {
              void (async () => {
                const ok = await apply("thread", () =>
                  mutateThread(`/api/v1/discussions/${thread.id}`, "DELETE"),
                );
                if (ok) {
                  router.push("/discussion");
                }
              })();
            }}
          />
        </div>
      ) : null}

      {errorId === "thread" && errorMessage ? (
        <div className="mt-4">
          <Alert>{errorMessage}</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-xl border border-edge bg-panel">
            <DiscussionPost thread={thread} />
            <DiscussionActions
              thread={thread}
              isBusy={threadBusy}
              shareLabel={shareLabel}
              onToggleLike={() =>
                void apply("thread", () =>
                  mutateThread(
                    `/api/v1/discussions/${thread.id}/reactions`,
                    thread.isLiked ? "DELETE" : "PUT",
                  ),
                )
              }
              onToggleFollow={() =>
                void apply("thread", () =>
                  mutateThread(
                    `/api/v1/discussions/${thread.id}/follow`,
                    thread.isFollowing ? "DELETE" : "PUT",
                  ),
                )
              }
              onShare={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setShareLabel("Link copied");
                  } catch {
                    // Clipboard access is refused in some contexts; say so
                    // rather than claiming a copy that did not happen.
                    setShareLabel("Copy failed");
                  }
                  setTimeout(() => setShareLabel("Share"), 2000);
                })();
              }}
              onJumpToComments={() =>
                commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          </div>

          <div ref={commentsRef} className="scroll-mt-20 space-y-4">
            <CommentList
              comments={thread.comment}
              totalCount={thread.commentCount}
              callbacks={{
                viewerName,
                isAdmin,
                canComment: thread.canComment,
                busyId,
                errorId,
                errorMessage,
                onReply: (parentId, body) =>
                  apply(parentId, () =>
                    mutateThread(`/api/v1/discussions/${thread.id}/replies`, "POST", {
                      body,
                      parentId,
                    }),
                  ),
                onToggleLike: (comment: CommentDto) =>
                  void apply(comment.id, () =>
                    mutateThread(
                      `/api/v1/discussions/${thread.id}/replies/${comment.id}/reactions`,
                      comment.isLiked ? "DELETE" : "PUT",
                    ),
                  ),
                onSetHidden: (comment, hidden) =>
                  void apply(comment.id, () =>
                    mutateThread(
                      `/api/v1/discussions/${thread.id}/replies/${comment.id}`,
                      "PATCH",
                      { status: hidden ? "HIDDEN" : "VISIBLE" },
                    ),
                  ),
                onDelete: (comment) =>
                  void apply(comment.id, () =>
                    mutateThread(
                      `/api/v1/discussions/${thread.id}/replies/${comment.id}`,
                      "DELETE",
                    ),
                  ),
              }}
            />

            {thread.canComment ? (
              <div className="rounded-xl border border-edge bg-panel p-4 sm:p-5">
                <CommentComposer
                  authorName={viewerName}
                  isBusy={busyId === "new-comment"}
                  error={errorId === "new-comment" ? errorMessage : null}
                  onSubmit={(body) =>
                    apply("new-comment", () =>
                      mutateThread(`/api/v1/discussions/${thread.id}/replies`, "POST", {
                        body,
                        parentId: null,
                      }),
                    )
                  }
                />
              </div>
            ) : (
              <p className="rounded-xl border border-edge bg-panel-raised/50 px-4 py-3 text-sm text-ink-muted">
                {closedReason(thread)}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <RelatedDiscussions related={thread.related} />
        </aside>
      </div>
    </main>
  );
}

/** Three switches close a thread for different reasons; say which one it was. */
function closedReason(thread: ThreadDetailDto): string {
  if (thread.status === "ARCHIVED") {
    return "This discussion has been archived. It stays readable, but no new comments can be added.";
  }
  if (thread.status === "DRAFT") {
    return "This is a draft. Comments open once it is published.";
  }
  if (thread.isLocked) {
    return "This discussion is locked. It stays readable, but no new comments can be added.";
  }
  return "Comments are turned off for this discussion.";
}
