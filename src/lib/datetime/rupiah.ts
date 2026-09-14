/**
 * Abbreviates a rupiah amount the way the market reports it: trillions for
 * turnover, billions for foreign flow. Kept out of the database so the stored
 * value stays a plain number.
 */
export function formatRupiahShort(value: number): string {
  const sign = value < 0 ? "-" : "";
  const magnitude = Math.abs(value);

  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1e12, suffix: "T" },
    { threshold: 1e9, suffix: "B" },
    { threshold: 1e6, suffix: "M" },
  ];

  for (const { threshold, suffix } of units) {
    if (magnitude >= threshold) {
      const scaled = magnitude / threshold;
      // One decimal below 100 keeps "8.4T" readable; above that it is noise.
      const digits = scaled >= 100 ? 0 : 1;
      return `${sign}Rp ${scaled.toFixed(digits)}${suffix}`;
    }
  }

  return `${sign}Rp ${Math.round(magnitude).toLocaleString("en-US")}`;
}

/** Same, but always carries an explicit sign — used for net flows. */
export function formatRupiahFlow(value: number): string {
  const formatted = formatRupiahShort(value);
  return value > 0 ? `+${formatted}` : formatted;
}
