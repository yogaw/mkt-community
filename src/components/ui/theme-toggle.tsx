"use client";

import { useLayoutEffect } from "react";
import { applyTheme, readStoredTheme, storeTheme, type Theme } from "@/lib/theme/theme";

/*
 * Which icon shows is decided by CSS from the data-theme attribute on <html>,
 * not by React state. The inline script in the root layout sets that attribute
 * before the first paint, so the correct icon is already on screen when the
 * page appears and there is nothing for React to reconcile on hydration.
 */
const sunClass = "h-4 w-4 [[data-theme=light]_&]:hidden";
const moonClass = "h-4 w-4 [[data-theme=dark]_&]:hidden";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ThemeToggle({ className }: { className?: string }) {
  // React's dev-only Strict Mode remount resets the attributes on <html> to the
  // ones it manages from JSX, dropping the one the inline script set. Re-apply
  // before paint. No-op in production.
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  function handleToggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Switch between dark and light theme"
      title="Switch theme"
      className={`shrink-0 rounded-lg border border-edge bg-panel p-2 text-ink-muted transition-colors hover:text-ink ${className ?? ""}`}
    >
      <svg className={sunClass} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1m11-5l-1.06 1.06M5.06 10.94L4 12m8 0l-1.06-1.06M5.06 5.06L4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg className={moonClass} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M13.5 9.7A5.8 5.8 0 016.3 2.5a5.8 5.8 0 107.2 7.2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
