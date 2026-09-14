"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { formatJakartaDateTime } from "@/features/discussion/discussion-display";
import type { CommentDto } from "@/features/discussion/discussion-types";
import { AdminBadge } from "./badges";
import { CommentComposer } from "./comment-composer";
import { DiscussionContentBody } from "./discussion-content-body";

export interface CommentCallbacks {
  viewerName: string;
  isAdmin: boolean;
  canComment: boolean;
  busyId: string | null;
  errorId: string | null;
  errorMessage: string | null;
  onReply: (parentId: string, body: string) => Promise<boolean>;
  onToggleLike: (comment: CommentDto) => void;
  onSetHidden: (comment: CommentDto, hidden: boolean) => void;
  onDelete: (comment: CommentDto) => void;
}

/**
 * A comment and, when it has them, its replies.
 *
 * Replies render one level in and no further: the service flattens anything
 * deeper onto the same parent, so a thread cannot indent itself into a column
 * two words wide.
 */
export function CommentItem({
  comment,
  callbacks,
  isReply = false,
}: {
  comment: CommentDto;
  callbacks: CommentCallbacks;
  isReply?: boolean;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const isHidden = comment.status === "HIDDEN";

  return (
    <li className={cn(isReply && "border-l border-edge pl-4 sm:pl-5")}>
      <article
        className={cn(
          "rounded-xl border p-4",
          comment.author.isAdmin
            ? "border-accent/25 bg-accent/[0.04]"
            : "border-edge bg-panel-raised/30",
          isHidden && "opacity-70",
        )}
      >
        <header className="flex items-center gap-2.5">
          <Avatar name={comment.author.name} className="h-8 w-8 text-[11px]" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{comment.author.name}</span>
              {comment.author.isAdmin ? <AdminBadge title="Analyst" /> : null}
              {isHidden ? (
                <span className="rounded bg-warn/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                  Hidden
                </span>
              ) : null}
            </p>
            <p className="text-xs text-ink-faint">{formatJakartaDateTime(comment.createdAt)}</p>
          </div>
        </header>

        <div className="mt-3">
          <DiscussionContentBody body={comment.body} />
        </div>

        <footer className="mt-3 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => callbacks.onToggleLike(comment)}
            disabled={callbacks.busyId === comment.id}
            aria-pressed={comment.isLiked}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              comment.isLiked ? "text-accent" : "text-ink-faint hover:text-ink",
            )}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill={comment.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M8 13.6S1.8 10 1.8 5.9A3.1 3.1 0 018 4.3a3.1 3.1 0 016.2 1.6C14.2 10 8 13.6 8 13.6z" strokeLinejoin="round" />
            </svg>
            {comment.isLiked ? "Liked" : "Like"}
            {comment.likeCount > 0 ? <span>{comment.likeCount}</span> : null}
          </button>

          {callbacks.canComment ? (
            <button
              type="button"
              onClick={() => setIsReplying((open) => !open)}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Reply
            </button>
          ) : null}

          {callbacks.isAdmin ? (
            <button
              type="button"
              onClick={() => callbacks.onSetHidden(comment, !isHidden)}
              disabled={callbacks.busyId === comment.id}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:text-warn disabled:opacity-50"
            >
              {isHidden ? "Unhide" : "Hide"}
            </button>
          ) : null}

          {callbacks.isAdmin || comment.isMine ? (
            <button
              type="button"
              onClick={() => callbacks.onDelete(comment)}
              disabled={callbacks.busyId === comment.id}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:text-down disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
        </footer>

        {isReplying ? (
          <div className="mt-4 border-t border-edge pt-4">
            <CommentComposer
              authorName={callbacks.viewerName}
              placeholder={`Reply to ${comment.author.name}...`}
              submitLabel="Post Reply"
              autoFocus
              isBusy={callbacks.busyId === comment.id}
              error={callbacks.errorId === comment.id ? callbacks.errorMessage : null}
              onCancel={() => setIsReplying(false)}
              onSubmit={async (body) => {
                const sent = await callbacks.onReply(comment.id, body);
                if (sent) {
                  setIsReplying(false);
                }
                return sent;
              }}
            />
          </div>
        ) : null}
      </article>

      {comment.reply.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {comment.reply.map((child) => (
            <CommentItem key={child.id} comment={child} callbacks={callbacks} isReply />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
