import type { DatePreset } from "@/features/stock-analysis/stock-analysis-types";

/**
 * Preset windows, measured back from the latest session the ingestion holds
 * rather than from today.
 *
 * Anchoring to "now" would produce an empty 1D on a Sunday, and an empty chart
 * that is really just a weekend is the most confusing failure this screen has.
 */
const CALENDAR_DAYS: Record<Exclude<DatePreset, "YTD" | "CUSTOM">, number> = {
  "1D": 0,
  "5D": 6,
  "1M": 29,
  "3M": 89,
  "6M": 179,
};

export function rangeForPreset(
  preset: DatePreset,
  latest: string,
  earliest: string,
): { startDate: string; endDate: string } {
  const endDate = latest;

  if (preset === "CUSTOM") {
    return { startDate: earliest, endDate };
  }

  const start =
    preset === "YTD"
      ? `${latest.slice(0, 4)}-01-01`
      : shiftDays(latest, -CALENDAR_DAYS[preset]);

  // Never ask for a window the ingestion cannot answer.
  return { startDate: start < earliest ? earliest : start, endDate };
}

export function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Which preset a range corresponds to, or CUSTOM when it matches none. */
export function presetForRange(
  startDate: string,
  endDate: string,
  latest: string,
  earliest: string,
): DatePreset {
  for (const preset of ["1D", "5D", "1M", "3M", "6M", "YTD"] as const) {
    const range = rangeForPreset(preset, latest, earliest);
    if (range.startDate === startDate && range.endDate === endDate) {
      return preset;
    }
  }
  return "CUSTOM";
}
