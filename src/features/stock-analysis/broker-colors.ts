/**
 * A broker's colour, decided by its code.
 *
 * Hashed rather than assigned by rank, so a broker keeps the same colour in the
 * chart, the legend, the ranking and the tooltip — and keeps it when the
 * period changes and the ranking reshuffles. A palette indexed by position
 * would repaint every line the moment somebody moved a date.
 *
 * The palette avoids the product's own accent green and its loss red, which
 * carry meaning elsewhere on the same screen.
 */
const PALETTE = [
  "#2563eb", // blue
  "#9333ea", // violet
  "#0891b2", // cyan
  "#c2410c", // burnt orange
  "#4d7c0f", // olive
  "#be185d", // magenta
  "#0f766e", // teal
  "#7c3aed", // indigo
  "#a16207", // amber
  "#475569", // slate
  "#1d4ed8", // deep blue
  "#b91c1c", // brick
] as const;

export function brokerColor(brokerCode: string): string {
  let hash = 2166136261;
  for (const character of brokerCode) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return PALETTE[(hash >>> 0) % PALETTE.length];
}
