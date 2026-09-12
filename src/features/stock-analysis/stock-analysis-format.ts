import { formatCompact, formatRupiah, formatRupiahSigned } from "@/features/market-overview/market-format";

/**
 * Financial formatting for Stock Analysis.
 *
 * Thin on purpose: formatRupiah and formatCompact already exist and are used by
 * the market overview, so a rupiah figure reads the same on every screen. What
 * is added here is the direction marker, because colour alone must never be the
 * only thing distinguishing a buy from a sell.
 */
export { formatCompact, formatRupiah, formatRupiahSigned };

/** Rp 13.91T / -Rp 46.44M. Always signed where a sign carries meaning. */
export function formatValueSigned(value: number): string {
  return formatRupiahSigned(value);
}

export function formatLotsSigned(lots: number): string {
  const sign = lots > 0 ? "+" : lots < 0 ? "-" : "";
  return `${sign}${Math.abs(lots).toLocaleString("en-US")}`;
}

export function formatLotsPlain(lots: number): string {
  return lots.toLocaleString("en-US");
}

/** 9,275 — an IDX price is whole rupiah. */
export function formatPrice(value: number | null, digits = 0): string {
  if (value === null) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercentSigned(value: number | null, digits = 2): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatPercentPlain(value: number | null, digits = 1): string {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

export function formatMultiple(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}x`;
}

/**
 * Direction, said in a glyph as well as a colour.
 *
 * Roughly one man in twelve cannot separate the green from the red, and a
 * broker table is exactly the place where that matters.
 */
export function directionMark(value: number): "▲" | "▼" | "—" {
  if (value > 0) {
    return "▲";
  }
  if (value < 0) {
    return "▼";
  }
  return "—";
}

export function directionWord(value: number): "Buy" | "Sell" | "Flat" {
  if (value > 0) {
    return "Buy";
  }
  if (value < 0) {
    return "Sell";
  }
  return "Flat";
}

export function toneFor(value: number): string {
  if (value > 0) {
    return "text-accent";
  }
  if (value < 0) {
    return "text-down";
  }
  return "text-ink-muted";
}

/** "03 Aug 2026 – 12 Sep 2026" */
export function formatDateRange(start: string, end: string): string {
  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

export function formatDayMonth(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(`${iso}T00:00:00Z`));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** "12 Sep 2026, 19:14 WIB" — when the ingestion last wrote. */
export function formatUpdatedAt(iso: string | null): string {
  if (!iso) {
    return "Unknown";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} WIB`;
}
