/**
 * A broker's colour, decided by its code.
 *
 * Hashed rather than assigned by rank, so a broker keeps the same colour in the
 * chart, the legend, the ranking, the table and the tooltip — and keeps it when
 * the period changes and the ranking reshuffles. A palette indexed by position
 * would repaint every line the moment somebody moved a date.
 *
 * Every hue is mid-lightness and saturated, because these lines are drawn on
 * the near-white panel in light mode and the near-black one in dark, and the
 * first palette here was picked against white alone — half of it disappeared
 * the moment the theme flipped. `broker-colors.test.ts` measures the contrast
 * against both grounds so that cannot happen again.
 *
 * Pure accent green and loss red are deliberately absent: on this screen they
 * mean buy and sell, and a broker line is an identity, not a direction.
 */
const PALETTE = [
  "#3b82f6", // blue
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#d97706", // amber
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
  "#65a30d", // lime
  "#fb7185", // rose
] as const;

export const BROKER_PALETTE = PALETTE;

export function brokerColor(brokerCode: string): string {
  let hash = 2166136261;
  for (const character of brokerCode) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return PALETTE[(hash >>> 0) % PALETTE.length];
}

/** WCAG relative luminance, used by the palette's contrast test. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const left = relativeLuminance(a);
  const right = relativeLuminance(b);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}
