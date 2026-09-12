"use client";

const KEY = "piranha-stock-analysis-recent";
const LIMIT = 6;

/**
 * Recently viewed, kept in this browser.
 *
 * A per-device convenience, not a synced preference: it does not belong in the
 * database, and every read is guarded because storage throws outright in a
 * private window or when site data is blocked.
 */
export function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecent(ticker: string): void {
  try {
    const next = [ticker, ...readRecent().filter((item) => item !== ticker)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the list simply stays empty.
  }
}
