import type { IndicatorUnit } from "@/features/market-data/indicator-catalogue";

/** Formats a close according to what the indicator actually measures. */
export function formatIndicatorValue(
  value: number,
  unit: IndicatorUnit,
  decimals: number,
): string {
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  switch (unit) {
    case "PERCENT":
      return `${number}%`;
    case "USD":
      return `$${number}`;
    case "IDR":
      return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals }).format(value)}`;
    default:
      return number;
  }
}

/** Always signed, two decimals. */
export function formatChange(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/**
 * Colour follows meaning, not sign. A rising 10-year yield, dollar or VIX is
 * usually read as risk-off, so those are toned the other way round.
 */
export function changeTone(value: number | null, invert: boolean): string {
  if (value === null || value === 0) {
    return "text-ink-muted";
  }
  const good = invert ? value < 0 : value > 0;
  return good ? "text-accent" : "text-down";
}

/** Sparkline path over a fixed viewBox; flat series render as a centre line. */
export function sparkPath(values: number[], width: number, height: number): string {
  if (values.length < 2) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
