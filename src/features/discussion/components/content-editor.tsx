"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { cn } from "@/lib/cn";
import { getToken } from "@/lib/auth/token-storage";
import { DiscussionContentBody } from "./discussion-content-body";

const MAX_BYTES = 5 * 1024 * 1024;

interface Tool {
  label: string;
  title: string;
  /** Wraps the selection, or inserts at the caret when nothing is selected. */
  apply: (selection: string) => string;
  /** Line tools act on the start of the line rather than the selection. */
  linePrefix?: string;
}

const TOOLS: Tool[] = [
  { label: "H", title: "Heading", apply: (s) => `## ${s || "Heading"}`, linePrefix: "## " },
  { label: "B", title: "Bold", apply: (s) => `**${s || "bold"}**` },
  { label: "I", title: "Italic", apply: (s) => `*${s || "italic"}*` },
  { label: "List", title: "Bullet list", apply: (s) => `- ${s || "item"}`, linePrefix: "- " },
  { label: "1.", title: "Numbered list", apply: (s) => `1. ${s || "item"}`, linePrefix: "1. " },
  { label: "Quote", title: "Quote", apply: (s) => `> ${s || "quote"}`, linePrefix: "> " },
  { label: "Link", title: "Link", apply: (s) => `[${s || "text"}](https://)` },
];

/**
 * A plain textarea with a toolbar that inserts markers, plus a preview.
 *
 * Deliberately not a rich-text editor. A contenteditable surface would mean
 * shipping a large dependency and then sanitising HTML on the way out; this
 * writes the same small markdown subset the renderer parses, which is plain
 * text all the way to the database and can never carry markup.
 */
export function ContentEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function insert(tool: Tool) {
    const area = areaRef.current;
    if (!area) {
      return;
    }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selection = value.slice(start, end);
    const replacement = tool.apply(selection);
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

    onChange(next);
    // Put the caret after what was inserted, so typing continues naturally.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Images must be 5 MB or smaller.");
      return;
    }
    const token = getToken();
    if (!token) {
      setUploadError("Your session has expired. Sign in again.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) {
        setUploadError("That image could not be uploaded.");
        return;
      }
      const body = (await response.json()) as { data: { url: string } };
      onChange(`${value}${value.endsWith("\n") || value === "" ? "" : "\n\n"}![Chart](${body.data.url})\n`);
    } catch {
      setUploadError("That image could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    // Charts usually arrive on the clipboard straight out of a charting tool.
    const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      void uploadImage(file);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-edge bg-panel-raised px-2 py-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            disabled={disabled || isPreview}
            onClick={() => insert(tool)}
            className="rounded px-2 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            {tool.label}
          </button>
        ))}

        <label className="cursor-pointer rounded px-2 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-panel hover:text-ink">
          {isUploading ? "Uploading…" : "Image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadImage(file);
              }
              event.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => setIsPreview((open) => !open)}
          className={cn(
            "ml-auto rounded px-2.5 py-1 text-xs font-semibold transition-colors",
            isPreview ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {isPreview ? (
        <div className="min-h-[18rem] rounded-b-lg border border-edge bg-panel-raised px-3 py-3">
          {value.trim() === "" ? (
            <p className="text-sm text-ink-faint">Nothing to preview yet.</p>
          ) : (
            <DiscussionContentBody body={value} />
          )}
        </div>
      ) : (
        <textarea
          ref={areaRef}
          rows={16}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          placeholder={"Write the discussion.\n\n## A heading\n- A bullet\n\nPaste a chart image straight in, and write $BBCA for a ticker."}
          className={cn(
            "w-full resize-y rounded-b-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink",
            "placeholder:text-ink-faint focus:border-accent focus:outline-none",
          )}
        />
      )}

      {uploadError ? <p className="text-xs text-down">{uploadError}</p> : null}
      <p className="text-xs text-ink-faint">
        Supports headings, lists, quotes, links, images and $TICKER mentions.
      </p>
    </div>
  );
}
