import type { HistoryPoint } from "@/features/market-data/market-data-model";

/**
 * Stand-in series for instruments whose provider is not connected yet.
 *
 * Generated rather than hand-written so a new instrument costs one catalogue
 * line, and deterministic so the same symbol always produces the same series —
 * a chart that reshuffles on every request is obviously fake and, worse,
 * untestable.
 *
 * This exists to let the UI be built and reviewed against the real interface.
 * Sample instruments never reach production: see isVisibleInEnvironment.
 */

/** mulberry32 — small, fast, and stable across runs. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(symbol: string): number {
  let hash = 2166136261;
  for (const character of symbol) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface SampleSpec {
  base: number;
  /** Daily standard deviation as a fraction. 0 holds the value flat. */
  volatility: number;
  drift: number;
}

/**
 * Walks backwards from the anchor so the final point is the quoted value and
 * the history leading to it is consistent with it.
 */
export function sampleSeries(
  symbol: string,
  spec: SampleSpec,
  sessions: number,
  lastDate: string,
): HistoryPoint[] {
  const random = seededRandom(seedFrom(symbol));
  const closes: number[] = [spec.base];

  for (let index = 1; index < sessions; index += 1) {
    const shock = (random() - 0.5) * 2 * spec.volatility;
    const previous = closes[index - 1];
    // A policy rate with zero volatility and zero drift stays exactly flat,
    // which is what a rate between meetings actually does.
    closes.push(previous * (1 + shock - spec.drift));
  }
  closes.reverse();

  const anchor = new Date(`${lastDate}T00:00:00Z`);
  const points: HistoryPoint[] = [];
  let cursor = new Date(anchor);
  const dates: string[] = [];

  // Weekdays only, so the series has a plausible trading calendar.
  while (dates.length < sessions) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor = new Date(cursor.getTime() - 86400000);
  }
  dates.reverse();

  for (const [index, date] of dates.entries()) {
    points.push({ date, close: closes[index] });
  }
  return points;
}
