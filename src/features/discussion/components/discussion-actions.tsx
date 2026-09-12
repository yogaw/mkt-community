"use client";

import { cn } from "@/lib/cn";
import { formatCount, pluralize } from "@/features/discussion/discussion-display";
import type { ThreadDetailDto } from "@/features/discussion/discussion-types";

/**
 * Like, comment count, follow, share. Nothing else — no reposting, no quoting,
 * no follower graph. This is a research board, and those turn one into a feed.
 */
export function DiscussionActions({
  thread,
  isBusy,
  onToggleLike,
  onToggleFollow,
  onShare,
  onJumpToComments,
  shareLabel,
}: {
  thread: ThreadDetailDto;
  isBusy: boolean;
  onToggleLike: () => void;
  onToggleFollow: () => void;
  onShare: () => void;
  onJumpToComments: () => void;
  shareLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-edge px-5 py-3 sm:px-6">
      <ActionButton
        onClick={onToggleLike}
        disabled={isBusy}
        active={thread.isLiked}
        label={thread.isLiked ? "Liked" : "Like"}
        pressed={thread.isLiked}
        icon={
          <svg width="15" height="15" viewBox="0 0 16 16" fill={thread.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M8 13.6S1.8 10 1.8 5.9A3.1 3.1 0 018 4.3a3.1 3.1 0 016.2 1.6C14.2 10 8 13.6 8 13.6z" strokeLinejoin="round" />
          </svg>
        }
        count={thread.likeCount}
      />

      <ActionButton
        onClick={onJumpToComments}
        label={pluralize(thread.commentCount, "comment")}
        icon={
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M2.5 4.2a1.2 1.2 0 011.2-1.2h8.6a1.2 1.2 0 011.2 1.2v5.4a1.2 1.2 0 01-1.2 1.2H6.4L3.4 13.3a.4.4 0 01-.64-.32V4.2z" strokeLinejoin="round" />
          </svg>
        }
      />

      <ActionButton
        onClick={onToggleFollow}
        disabled={isBusy}
        active={thread.isFollowing}
        pressed={thread.isFollowing}
        label={thread.isFollowing ? "Following" : "Follow"}
        title={
          thread.isFollowing
            ? "You will see updates here. Email and push are not connected yet."
            : "Keep track of this discussion"
        }
        icon={
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M8 2.2a3.6 3.6 0 013.6 3.6c0 3 1.3 4.3 1.3 4.3H3.1s1.3-1.3 1.3-4.3A3.6 3.6 0 018 2.2z" strokeLinejoin="round" />
            <path d="M6.6 12.4a1.5 1.5 0 002.8 0" />
          </svg>
        }
      />

      <ActionButton
        onClick={onShare}
        label={shareLabel}
        icon={
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M11 5.2V3.6a.9.9 0 011.5-.65l2.8 2.6a.9.9 0 010 1.3l-2.8 2.6A.9.9 0 0111 8.8V7.2C6.5 7.2 4.4 9 3.4 12.6c-.2-4.9 1.6-7.4 7.6-7.4z" strokeLinejoin="round" />
          </svg>
        }
      />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  count,
  active = false,
  pressed,
  disabled,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-accent/10 text-accent" : "text-ink-muted hover:bg-panel-raised hover:text-ink",
      )}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 ? (
        <span className="text-xs text-ink-faint">{formatCount(count)}</span>
      ) : null}
    </button>
  );
}
