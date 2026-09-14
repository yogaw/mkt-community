"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getToken } from "@/lib/auth/token-storage";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import {
  CATEGORY_LABEL,
  DISCUSSION_CATEGORIES,
  MAX_TAGS,
  MAX_TICKERS,
  type DiscussionCategory,
  type ThreadDetailDto,
} from "@/features/discussion/discussion-types";
import { useIsAdmin } from "@/features/discussion/use-discussion-session";
import { ContentEditor } from "./content-editor";
import { TokenListInput } from "./token-list-input";
import { DiscussionContentBody } from "./discussion-content-body";
import { CategoryBadge } from "./badges";
import { ThreadSkeleton } from "./discussion-skeletons";

interface Draft {
  title: string;
  excerpt: string;
  body: string;
  category: DiscussionCategory;
  tags: string[];
  tickers: string[];
  thumbnailUrl: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  commentsEnabled: boolean;
}

const BLANK: Draft = {
  title: "",
  excerpt: "",
  body: "",
  category: "MARKET_OUTLOOK",
  tags: [],
  tickers: [],
  thumbnailUrl: null,
  isPinned: false,
  isFeatured: false,
  commentsEnabled: true,
};

type Mode = "loading" | "ready" | "denied" | "not-found" | "error";

/**
 * Create and edit, one form.
 *
 * The two differ only in where the initial values come from and which verb the
 * save uses, and keeping them together is what stops the edit form quietly
 * losing a field the create form gained.
 */
export function AdminDiscussionEditor({ discussionId }: { discussionId?: string }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isEditing = discussionId !== undefined;

  const [draft, setDraft] = useState<Draft>(BLANK);
  const [existing, setExisting] = useState<ThreadDetailDto | null>(null);
  const [mode, setMode] = useState<Mode>(isEditing ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: ThreadDetailDto }>(
        `/api/v1/discussions/${discussionId}`,
      );
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome === "not-found") {
        setMode("not-found");
        return;
      }
      if (result.outcome !== "loaded") {
        setMode("error");
        return;
      }

      const thread = result.body.data;
      setExisting(thread);
      setDraft({
        title: thread.title,
        excerpt: thread.excerpt,
        body: thread.body,
        category: thread.category,
        tags: thread.tags,
        tickers: thread.tickers,
        thumbnailUrl: thread.thumbnailUrl,
        isPinned: thread.isPinned,
        isFeatured: thread.isFeatured,
        commentsEnabled: thread.commentsEnabled,
      });
      setMode("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [discussionId, isEditing, router]);

  function patch(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function validate(): string | null {
    if (draft.title.trim().length < 4) {
      return "Give the discussion a title of at least four characters.";
    }
    if (draft.excerpt.trim().length < 10) {
      return "Write a summary — it is what the feed shows under the title.";
    }
    if (draft.body.trim().length < 10) {
      return "Write the discussion itself before publishing it.";
    }
    return null;
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const token = getToken();
    if (!token) {
      setError(humanizeErrorCode("general.error.unauthorized"));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        isEditing ? `/api/v1/discussions/${discussionId}` : "/api/v1/discussions",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...draft, status }),
        },
      );

      if (response.status === 403) {
        setError("Only admins can publish discussions.");
        return;
      }
      if (!response.ok) {
        setError(humanizeErrorCode("general.error.validation"));
        return;
      }

      const body = (await response.json()) as { data: ThreadDetailDto };
      router.push(`/discussion/${body.data.id}`);
    } catch {
      setError(humanizeErrorCode("general.error.server_error"));
    } finally {
      setIsSaving(false);
    }
  }

  // The API refuses a non-admin regardless; this is the courtesy, not the gate.
  if (!isAdmin && mode !== "loading") {
    return (
      <main className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6">
        <EmptyState
          title="Discussions are opened by the Piranha desk."
          description="Only admins can start a discussion. You can comment on any published thread."
          action={
            <Button onClick={() => router.push("/discussion")} className="w-auto px-6">
              Browse Discussions
            </Button>
          }
        />
      </main>
    );
  }

  if (mode === "loading") {
    return (
      <main className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6">
        <ThreadSkeleton />
      </main>
    );
  }

  if (mode === "not-found" || mode === "error") {
    return (
      <main className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6">
        <EmptyState
          title={mode === "not-found" ? "That discussion no longer exists." : "We could not load it."}
          action={
            <Button onClick={() => router.push("/discussion")} className="w-auto px-6">
              Back to Discussions
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6">
      <Link
        href={isEditing ? `/discussion/${discussionId}` : "/discussion"}
        className="inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        &larr; {isEditing ? "Back to discussion" : "Back to Discussions"}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {isEditing ? "Edit Discussion" : "New Discussion"}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {isEditing
          ? "Changes go live as soon as you save."
          : "Open a question for the community. Members comment; only the desk starts threads."}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("PUBLISHED");
        }}
        className="mt-6 space-y-5"
        noValidate
      >
        {error ? <Alert>{error}</Alert> : null}

        <Input
          label="Title"
          placeholder="Market Outlook — September 2026"
          value={draft.title}
          onChange={(event) => patch({ title: event.target.value })}
          maxLength={200}
        />

        <div className="space-y-1.5">
          <label htmlFor="editor-category" className="block text-sm font-medium text-ink-muted">
            Category
          </label>
          <select
            id="editor-category"
            value={draft.category}
            onChange={(event) => patch({ category: event.target.value as DiscussionCategory })}
            className="w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          >
            {DISCUSSION_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="editor-excerpt" className="block text-sm font-medium text-ink-muted">
            Summary
          </label>
          <textarea
            id="editor-excerpt"
            rows={2}
            maxLength={400}
            value={draft.excerpt}
            onChange={(event) => patch({ excerpt: event.target.value })}
            placeholder="Global market update, Fed decision, and IHSG outlook."
            className="w-full resize-y rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-ink-faint">Shown under the title in the feed.</p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink-muted">Content</span>
          <ContentEditor
            value={draft.body}
            onChange={(body) => patch({ body })}
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TokenListInput
            id="editor-tags"
            label="Tags"
            placeholder="Coal, Commodities…"
            hint={`Enter or comma to add. Up to ${MAX_TAGS}.`}
            values={draft.tags}
            max={MAX_TAGS}
            onChange={(tags) => patch({ tags })}
          />
          <TokenListInput
            id="editor-tickers"
            label="Related tickers"
            placeholder="ADRO, ITMG…"
            hint={`Enter or comma to add. Up to ${MAX_TICKERS}.`}
            values={draft.tickers}
            max={MAX_TICKERS}
            uppercase
            onChange={(tickers) => patch({ tickers })}
          />
        </div>

        <ThumbnailField
          value={draft.thumbnailUrl}
          disabled={isSaving}
          onChange={(thumbnailUrl) => patch({ thumbnailUrl })}
        />

        <fieldset className="space-y-2.5 rounded-xl border border-edge p-4">
          <legend className="px-1 text-sm font-medium text-ink-muted">Options</legend>
          <Toggle
            label="Pin discussion"
            hint="Floats it to the top of the feed."
            checked={draft.isPinned}
            onChange={(isPinned) => patch({ isPinned })}
          />
          <Toggle
            label="Feature discussion"
            hint="Marks it as a highlight in the feed."
            checked={draft.isFeatured}
            onChange={(isFeatured) => patch({ isFeatured })}
          />
          <Toggle
            label="Allow comments"
            hint="Turn off to publish a read-only note."
            checked={draft.commentsEnabled}
            onChange={(commentsEnabled) => patch({ commentsEnabled })}
          />
        </fieldset>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-edge bg-canvas py-4">
          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="px-5"
              disabled={isSaving}
              onClick={() => setIsPreviewOpen(true)}
            >
              Preview Post
            </Button>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="px-5"
              disabled={isSaving}
              onClick={() => void save("DRAFT")}
            >
              Save Draft
            </Button>
          </div>
          <div className="shrink-0">
            <Button type="submit" className="px-5" disabled={isSaving}>
              {isSaving ? "Saving…" : existing?.status === "PUBLISHED" ? "Save Changes" : "Publish"}
            </Button>
          </div>
        </div>
      </form>

      <Modal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={draft.title || "Untitled discussion"}
        description="How this will read once published."
      >
        <div className="space-y-4 px-5 py-5">
          <CategoryBadge category={draft.category} />
          <p className="text-sm text-ink-muted">{draft.excerpt || "No summary yet."}</p>
          <div className="border-t border-edge pt-4">
            {draft.body.trim() === "" ? (
              <p className="text-sm text-ink-faint">Nothing written yet.</p>
            ) : (
              <DiscussionContentBody body={draft.body} />
            )}
          </div>
        </div>
      </Modal>
    </main>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-ink-faint">{hint}</span>
      </span>
    </label>
  );
}

function ThumbnailField({
  value,
  disabled,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    const token = getToken();
    if (!token) {
      setError("Your session has expired. Sign in again.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) {
        setError("That image could not be uploaded.");
        return;
      }
      const body = (await response.json()) as { data: { url: string } };
      onChange(body.data.url);
    } catch {
      setError("That image could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-ink-muted">Cover image</span>

      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <span className="h-[3.25rem] w-20 shrink-0 overflow-hidden rounded-lg border border-edge">
            <Image src={value} alt="" width={160} height={104} unoptimized className="h-full w-full object-cover" />
          </span>
        ) : (
          <span className="flex h-[3.25rem] w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-edge text-xs text-ink-faint">
            None
          </span>
        )}

        <label
          className={cn(
            "cursor-pointer rounded-lg border border-edge bg-panel-raised px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint",
            (disabled || isUploading) && "cursor-not-allowed opacity-60",
          )}
        >
          {isUploading ? "Uploading…" : value ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
              event.target.value = "";
            }}
          />
        </label>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-medium text-ink-faint transition-colors hover:text-down"
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-down">{error}</p> : null}
      <p className="text-xs text-ink-faint">
        Optional. Without one, the feed shows the category mark.
      </p>
    </div>
  );
}
