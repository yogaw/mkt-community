/**
 * Indonesian-market display formatting.
 *
 * Every volume in the API is SHARES. IDX publishes shares, and the lot is a
 * display convention (1 lot = 100 shares), so the conversion happens here and
 * the label always says which one is on screen. Nothing labelled "lot" is ever
 * a share count.
 */
export const SHARES_PER_LOT = 100;

const UNITS: Array<{ threshold: number; suffix: string }> = [
  { threshold: 1e12, suffix: "T" },
  { threshold: 1e9, suffix: "B" },
  { threshold: 1e6, suffix: "M" },
  { threshold: 1e3, suffix: "K" },
];

/** 3_990_000_000_000 -> "3.99T"; 1_940_000 -> "1.94M". */
export function formatCompact(value: number, digits = 2): string {
  const sign = value < 0 ? "-" : "";
  const magnitude = Math.abs(value);

  for (const { threshold, suffix } of UNITS) {
    if (magnitude >= threshold) {
      return `${sign}${(magnitude / threshold).toFixed(digits)}${suffix}`;
    }
  }
  return `${sign}${magnitude.toFixed(0)}`;
}

/** 3_990_000_000_000 -> "Rp 3.99T". */
export function formatRupiah(value: number, digits = 2): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}Rp ${formatCompact(Math.abs(value), digits)}`;
}

/** Always signed, for net flows: "+Rp 640.00B" / "-Rp 732.62B". */
export function formatRupiahSigned(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${formatRupiah(value, digits)}`;
}

/** Shares in, shares out. 28_617_128_161 -> "28.62B shares". */
export function formatShares(value: number, digits = 2): string {
  return `${formatCompact(value, digits)}`;
}

/** Shares in, LOTS out — the conversion is explicit, never implied by a label. */
export function formatLots(shares: number, digits = 2): string {
  return formatCompact(shares / SHARES_PER_LOT, digits);
}

/** 1_916_611 -> "1.92M". */
export function formatFrequency(value: number, digits = 2): string {
  return formatCompact(value, digits);
}

/** 6541.377 -> "6,541.38". */
export function formatIndexLevel(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** -0.7332 -> "-0.73%". Already-signed, since direction is the point. */
export function formatPercent(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/** -47.961 -> "-47.96". */
export function formatPoints(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

/**
 * "2026-09-11" -> "11 Sep 2026", in WIB so the label matches the session.
 *
 * Assembled from parts rather than taking a locale's whole pattern: en-GB
 * renders September as "Sept" under newer ICU, and the month abbreviation
 * should not change because Node updated.
 */
export function formatTradingDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(`${iso}T00:00:00+07:00`));

  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${find("day")} ${find("month")} ${find("year")}`;
}
