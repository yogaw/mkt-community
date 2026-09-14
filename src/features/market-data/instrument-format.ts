import type { Instrument } from "@/features/market-data/market-data-model";

/** Formats a value with its own currency or unit convention. */
export function formatValue(instrument: Instrument, value: number): string {
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: instrument.decimals,
    maximumFractionDigits: instrument.decimals,
  }).format(value);

  // en-US grouping throughout, including rupiah: the rest of the app formats
  // this way, and mixing conventions would print IHSG as "6.541,38" beside a
  // change of "-47.96" on the same card.
  switch (instrument.currency) {
    case "%":
      return `${number}%`;
    case "bps":
      return `${number} bps`;
    case "USD":
      return `$${number}`;
    case "USc":
      return `${number}¢`;
    default:
      return number;
  }
}

/**
 * Rates move in basis points. Quoting a 6-basis-point move on a 4.97% yield as
 * "+1.21%" is technically true and practically useless, so rate-like
 * instruments show the absolute move instead.
 */
export function formatChange(instrument: Instrument): string {
  if (instrument.change === null) {
    return "—";
  }
  if (instrument.preferBasisPoints) {
    const bps = Math.round(instrument.change * 100);
    return `${bps > 0 ? "+" : ""}${bps} bps`;
  }
  const sign = instrument.change > 0 ? "+" : "";
  return `${sign}${instrument.change.toFixed(instrument.decimals)}`;
}

export function formatChangePercent(instrument: Instrument): string {
  if (instrument.changePercent === null) {
    return "—";
  }
  return `${instrument.changePercent > 0 ? "+" : ""}${instrument.changePercent.toFixed(2)}%`;
}

/**
 * Whether the day's move reads as good news for this instrument, or null when
 * it is flat or unknown. A falling VIX and a falling yield are both rallies;
 * sign alone would colour them as losses.
 */
export function isFavourable(instrument: Instrument): boolean | null {
  const value = instrument.changePercent;
  if (value === null || value === 0) {
    return null;
  }
  return instrument.invertTone ? value < 0 : value > 0;
}

/** Colour follows meaning: a rising yield or dollar is not good news. */
export function toneFor(instrument: Instrument): string {
  const good = isFavourable(instrument);
  if (good === null) {
    return "text-ink-muted";
  }
  return good ? "text-accent" : "text-down";
}

/** "ICE Brent Crude · ICE · USD / barrel" */
export function describeInstrument(instrument: Instrument): string {
  return [
    instrument.benchmark ?? instrument.exchange,
    instrument.unit ? `${instrument.currency} / ${instrument.unit}` : instrument.currency,
  ]
    .filter(Boolean)
    .join(" · ");
}
