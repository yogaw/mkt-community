"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * Tags and tickers: type, press Enter or comma, get a chip. Two lists with the
 * same shape, so one component rather than two that drift apart.
 */
export function TokenListInput({
  id,
  label,
  hint,
  placeholder,
  values,
  max,
  uppercase = false,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  values: string[];
  max: number;
  uppercase?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const value = uppercase ? raw.trim().toUpperCase() : raw.trim();
    if (value === "" || values.includes(value) || values.length >= max) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    // Backspace on an empty field removes the last chip, which is what every
    // other tag field does and what fingers expect.
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-muted">
        {label}
      </label>

      <div className="flex flex-wrap gap-2 rounded-lg border border-edge bg-panel-raised px-2.5 py-2 focus-within:border-accent">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-ink"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              aria-label={`Remove ${value}`}
              className="text-ink-faint transition-colors hover:text-down"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}

        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(uppercase ? event.target.value.toUpperCase() : event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          disabled={values.length >= max}
          placeholder={values.length >= max ? `${max} is the limit` : placeholder}
          className={cn(
            "min-w-[8rem] flex-1 bg-transparent text-sm text-ink outline-none",
            "placeholder:text-ink-faint disabled:cursor-not-allowed",
          )}
        />
      </div>

      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
