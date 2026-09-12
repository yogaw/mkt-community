import {
  CATEGORY_BLURB,
  CATEGORY_LABEL,
  type DiscussionCategory,
  type DiscussionStatus,
} from "@/features/discussion/discussion-types";

/**
 * How each room looks.
 *
 * Five tokens, one per category, reused by the card, the chip and the thread
 * thumbnail so a reader learns a colour once and then recognises it everywhere.
 * They are the existing theme's categorical colours rather than new ones, which
 * is what keeps the light theme working without a second palette.
 */
export interface CategoryStyle {
  label: string;
  blurb: string;
  /** Fill and text for the tinted card and the thumbnail. */
  tint: string;
  /** The same pairing at chip scale. */
  chip: string;
}

export const CATEGORY_STYLE: Record<DiscussionCategory, CategoryStyle> = {
  MARKET_OUTLOOK: {
    label: CATEGORY_LABEL.MARKET_OUTLOOK,
    blurb: CATEGORY_BLURB.MARKET_OUTLOOK,
    tint: "bg-info/10 text-info",
    chip: "bg-info/10 text-info",
  },
  STOCK_DISCUSSION: {
    label: CATEGORY_LABEL.STOCK_DISCUSSION,
    blurb: CATEGORY_BLURB.STOCK_DISCUSSION,
    tint: "bg-accent/10 text-accent",
    chip: "bg-accent/10 text-accent",
  },
  MACRO_ECONOMY: {
    label: CATEGORY_LABEL.MACRO_ECONOMY,
    blurb: CATEGORY_BLURB.MACRO_ECONOMY,
    tint: "bg-alt/10 text-alt",
    chip: "bg-alt/10 text-alt",
  },
  SECTOR_ANALYSIS: {
    label: CATEGORY_LABEL.SECTOR_ANALYSIS,
    blurb: CATEGORY_BLURB.SECTOR_ANALYSIS,
    tint: "bg-warn/10 text-warn",
    chip: "bg-warn/10 text-warn",
  },
  STRATEGY_PSYCHOLOGY: {
    label: CATEGORY_LABEL.STRATEGY_PSYCHOLOGY,
    blurb: CATEGORY_BLURB.STRATEGY_PSYCHOLOGY,
    tint: "bg-down/10 text-down",
    chip: "bg-down/10 text-down",
  },
};

export const STATUS_LABEL: Record<DiscussionStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** "3.4K" under a thread, "412" below a thousand's worth of reading. */
export function formatCount(count: number): string {
  if (count < 1000) {
    return String(count);
  }
  if (count < 1_000_000) {
    const thousands = count / 1000;
    return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}K`;
  }
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * "16 Sep 2026, 09:12 WIB" — the market's own clock, stated.
 *
 * Assembled from parts rather than taken from a single locale: en-GB gives the
 * day-first order this wants but abbreviates September as "Sept", which would
 * sit next to the "Sep" that formatDate prints on the same page.
 */
export function formatJakartaDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(value));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} WIB`;
}
