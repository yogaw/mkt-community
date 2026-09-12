"use client";

import { pluralize } from "@/features/discussion/discussion-display";
import type { CommentDto } from "@/features/discussion/discussion-types";
import { CommentItem, type CommentCallbacks } from "./comment-item";

export function CommentList({
  comments,
  totalCount,
  callbacks,
}: {
  comments: CommentDto[];
  totalCount: number;
  callbacks: CommentCallbacks;
}) {
  return (
    <section aria-label="Comments">
      <h2 className="text-base font-semibold text-ink">
        {pluralize(totalCount, "Comment")}
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-edge p-6 text-center text-sm text-ink-muted">
          No comments yet. Be the first to add your reasoning.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} callbacks={callbacks} />
          ))}
        </ul>
      )}
    </section>
  );
}
