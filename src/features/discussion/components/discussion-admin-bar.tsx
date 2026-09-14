"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ThreadDetailDto } from "@/features/discussion/discussion-types";

/**
 * Moderation, kept out of the reading surface: one strip of controls that only
 * admins ever receive from the API's point of view as well as the UI's.
 */
export function DiscussionAdminBar({
  thread,
  isBusy,
  onPatch,
  onDelete,
}: {
  thread: ThreadDetailDto;
  isBusy: boolean;
  onPatch: (changes: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-edge bg-panel-raised/40 px-4 py-3">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Admin
      </span>

      <Link
        href={`/discussion/${thread.id}/edit`}
        className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Edit
      </Link>

      <AdminAction
        label={thread.isPinned ? "Unpin" : "Pin"}
        active={thread.isPinned}
        disabled={isBusy}
        onClick={() => onPatch({ isPinned: !thread.isPinned })}
      />
      <AdminAction
        label={thread.isFeatured ? "Unfeature" : "Feature"}
        active={thread.isFeatured}
        disabled={isBusy}
        onClick={() => onPatch({ isFeatured: !thread.isFeatured })}
      />
      <AdminAction
        label={thread.commentsEnabled ? "Disable comments" : "Enable comments"}
        disabled={isBusy}
        onClick={() => onPatch({ commentsEnabled: !thread.commentsEnabled })}
      />
      <AdminAction
        label={thread.isLocked ? "Unlock" : "Lock"}
        disabled={isBusy}
        onClick={() => onPatch({ isLocked: !thread.isLocked })}
      />

      {thread.status === "DRAFT" ? (
        <AdminAction label="Publish" disabled={isBusy} onClick={() => onPatch({ status: "PUBLISHED" })} />
      ) : null}
      {thread.status === "PUBLISHED" ? (
        <AdminAction label="Archive" disabled={isBusy} onClick={() => onPatch({ status: "ARCHIVED" })} />
      ) : null}
      {thread.status === "ARCHIVED" ? (
        <AdminAction label="Restore" disabled={isBusy} onClick={() => onPatch({ status: "PUBLISHED" })} />
      ) : null}

      <button
        type="button"
        onClick={onDelete}
        disabled={isBusy}
        className="ml-auto rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-medium text-down transition-colors hover:border-down/50 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

function AdminAction({
  label,
  active = false,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "border-accent bg-accent/10 text-accent" : "border-edge bg-panel text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
