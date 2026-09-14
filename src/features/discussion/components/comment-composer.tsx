"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const MAX_LENGTH = 4000;

/**
 * Plain multiline text. No toolbar, no rich text — a comment is a paragraph or
 * two, and the ceremony of a formatting bar makes people write less, not more.
 * $TICKER is recognised when the comment renders, so a ticker is one keystroke.
 */
export function CommentComposer({
  authorName,
  placeholder = "Write a comment...",
  submitLabel = "Post Comment",
  autoFocus = false,
  isBusy,
  error,
  onSubmit,
  onCancel,
}: {
  authorName: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  isBusy: boolean;
  error: string | null;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (body.trim() === "") {
      return;
    }
    // The draft survives a failed post — losing what someone typed because a
    // request fell over is the worst thing this form can do.
    if (await onSubmit(body.trim())) {
      setBody("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Avatar name={authorName} className="hidden h-9 w-9 text-xs sm:flex" />

      <div className="min-w-0 flex-1 space-y-2">
        {error ? <Alert>{error}</Alert> : null}

        <label htmlFor="comment-body" className="sr-only">
          {placeholder}
        </label>
        <textarea
          id="comment-body"
          rows={3}
          autoFocus={autoFocus}
          maxLength={MAX_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full resize-y rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink",
            "placeholder:text-ink-faint focus:border-accent focus:outline-none",
          )}
        />

        <div className="flex items-center justify-end gap-2">
          {body.length > MAX_LENGTH - 200 ? (
            <span className="mr-auto text-xs text-ink-faint">
              {MAX_LENGTH - body.length} characters left
            </span>
          ) : null}
          {onCancel ? (
            <div className="shrink-0">
              <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-2">
                Cancel
              </Button>
            </div>
          ) : null}
          <div className="shrink-0">
            <Button type="submit" disabled={isBusy || body.trim() === ""} className="px-4 py-2">
              {isBusy ? "Posting…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
