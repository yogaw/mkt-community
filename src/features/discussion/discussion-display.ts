import {
  CATEGORY_BLURB,
  CATEGORY_LABEL,
  type DiscussionCategory,
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
  /** Text-only, for the chip on a thread row. */
  chip: string;
  ring: string;
}

export const CATEGORY_STYLE: Record<DiscussionCategory, CategoryStyle> = {
  MARKET_OUTLOOK: {
    label: CATEGORY_LABEL.MARKET_OUTLOOK,
    blurb: CATEGORY_BLURB.MARKET_OUTLOOK,
    tint: "bg-info/10 text-info",
    chip: "bg-info/10 text-info",
    ring: "ring-info/40",
  },
  STOCK_DISCUSSION: {
    label: CATEGORY_LABEL.STOCK_DISCUSSION,
    blurb: CATEGORY_BLURB.STOCK_DISCUSSION,
    tint: "bg-accent/10 text-accent",
    chip: "bg-accent/10 text-accent",
    ring: "ring-accent/40",
  },
  MACRO_ECONOMY: {
    label: CATEGORY_LABEL.MACRO_ECONOMY,
    blurb: CATEGORY_BLURB.MACRO_ECONOMY,
    tint: "bg-alt/10 text-alt",
    chip: "bg-alt/10 text-alt",
    ring: "ring-alt/40",
  },
  SECTOR_ANALYSIS: {
    label: CATEGORY_LABEL.SECTOR_ANALYSIS,
    blurb: CATEGORY_BLURB.SECTOR_ANALYSIS,
    tint: "bg-warn/10 text-warn",
    chip: "bg-warn/10 text-warn",
    ring: "ring-warn/40",
  },
  STRATEGY_PSYCHOLOGY: {
    label: CATEGORY_LABEL.STRATEGY_PSYCHOLOGY,
    blurb: CATEGORY_BLURB.STRATEGY_PSYCHOLOGY,
    tint: "bg-down/10 text-down",
    chip: "bg-down/10 text-down",
    ring: "ring-down/40",
  },
};

/** "3.4K" under a thread, "412" above a thousand's worth of reading. */
export function formatViews(count: number): string {
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
