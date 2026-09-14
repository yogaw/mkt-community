"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import Image from "next/image";
import { getToken } from "@/lib/auth/token-storage";
import { MAX_CHART_IMAGES } from "@/features/signals/signal-types";

const MAX_BYTES = 5 * 1024 * 1024;

interface ChartImageInputProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

/*
 * Charts arrive two ways: picked from disk, or pasted straight out of a
 * charting tool with Ctrl+V. Both land on the same upload path, and the field
 * holds the returned URLs rather than the image data.
 */
export function ChartImageInput({ images, onChange, disabled }: ChartImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    const room = MAX_CHART_IMAGES - images.length;
    if (room <= 0) {
      setError(`Up to ${MAX_CHART_IMAGES} charts per signal.`);
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Your session has expired. Sign in again.");
      return;
    }

    const accepted = files.filter((file) => file.type.startsWith("image/")).slice(0, room);
    if (accepted.length === 0) {
      return;
    }
    if (accepted.some((file) => file.size > MAX_BYTES)) {
      setError("Each chart must be 5 MB or smaller.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];
      for (const file of accepted) {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/v1/uploads", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        if (!response.ok) {
          setError("That chart could not be uploaded.");
          break;
        }
        const result = (await response.json()) as { data: { url: string } };
        uploaded.push(result.data.url);
      }

      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
      }
    } catch {
      setError("That chart could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const files = [...event.clipboardData.files];
    if (files.length === 0) {
      return;
    }
    // Only swallow the paste when it actually carried an image.
    event.preventDefault();
    void upload(files);
  }

  function remove(url: string) {
    onChange(images.filter((image) => image !== url));
  }

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-ink-muted">Chart Images</span>
        <span className="text-xs text-ink-faint">
          Attach a file, or paste a screenshot with Ctrl+V
        </span>
      </div>

      <div className="rounded-lg border border-dashed border-edge bg-panel-raised/40 p-3">
        {images.length > 0 ? (
          <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url) => (
              <li key={url} className="group relative overflow-hidden rounded-lg border border-edge">
                <Image
                  src={url}
                  alt="Attached chart"
                  width={320}
                  height={200}
                  unoptimized
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(url)}
                  aria-label="Remove chart"
                  className="absolute top-1 right-1 rounded-md bg-canvas/80 p-1 text-ink-muted hover:text-down"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            void upload([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || isUploading || images.length >= MAX_CHART_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-edge bg-panel px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Add chart image"}
        </button>
        <span className="ml-2 text-xs text-ink-faint">
          {images.length}/{MAX_CHART_IMAGES}
        </span>
      </div>

      {error ? <p className="text-xs text-down">{error}</p> : null}
    </div>
  );
}
