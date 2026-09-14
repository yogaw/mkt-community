import { z } from "zod";

export const DEFAULT_SIGNALS_PAGE_SIZE = 20;

export const SIGNAL_TABS = ["active", "watchlist", "history"] as const;
export type SignalTab = (typeof SIGNAL_TABS)[number];

export const SIGNAL_SORTS = ["newest", "oldest", "return-desc", "return-asc", "ticker"] as const;
export type SignalSort = (typeof SIGNAL_SORTS)[number];

export const signalsQuerySchema = z.object({
  tab: z.enum(SIGNAL_TABS).default("active"),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  type: z.enum(["SWING", "TRADING", "POSITION"]).optional(),
  status: z.enum(["ACTIVE", "TP1_HIT", "TP2_HIT", "STOP_LOSS", "CLOSED"]).optional(),
  sort: z.enum(SIGNAL_SORTS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(DEFAULT_SIGNALS_PAGE_SIZE),
});

export type SignalsQuery = z.infer<typeof signalsQuerySchema>;

export interface SignalFilter extends SignalsQuery {
  userId: string;
}

export type SignalType = "SWING" | "TRADING" | "POSITION";
export type SignalStatus = "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "STOP_LOSS" | "CLOSED";
export type SignalEventState = "DONE" | "PENDING" | "ACTIVE";
export type SignalEventType = "ENTRY" | "UPDATE" | "TARGET" | "STOP_LOSS";

export interface SignalRowDto {
  id: string;
  ticker: string;
  companyName: string;
  type: SignalType;
  entryLow: number;
  entryHigh: number;
  currentPrice: number;
  target1: number;
  target2: number | null;
  stopLoss: number;
  status: SignalStatus;
  /** Move from the low end of the entry range to the current price, in percent. */
  returnPercent: number;
  issuedAt: string;
  isWatchlisted: boolean;
}

export interface SignalEventDto {
  id: string;
  kind: SignalEventType;
  state: SignalEventState;
  title: string;
  detail: string | null;
  occurredAt: string | null;
}

export interface SignalDetailDto extends SignalRowDto {
  /** Reward per unit of risk, e.g. "1:3". */
  riskReward: string;
  timeHorizon: string;
  thesis: string;
  /** Chart images attached to the thesis, in the order they were added. */
  chartImages: string[];
  keyCatalysts: string[];
  /** Remaining move from the current price to each level, in percent. */
  target1UpsidePercent: number;
  target2UpsidePercent: number | null;
  stopLossDownsidePercent: number;
  closedAt: string | null;
  timeline: SignalEventDto[];
}

export interface SignalStatsDto {
  activeCount: number;
  watchlistCount: number;
  targetHitThisWeek: number;
  stopLossThisWeek: number;
  winRatePercent: number;
  wins: number;
  losses: number;
}

export interface SignalTypePerformanceDto {
  type: SignalType;
  closed: number;
  wins: number;
  winRatePercent: number;
  averageReturnPercent: number;
}

export interface SignalPerformanceDto {
  closed: number;
  wins: number;
  losses: number;
  winRatePercent: number;
  averageReturnPercent: number;
  averageWinPercent: number;
  averageLossPercent: number;
  best: { ticker: string; returnPercent: number } | null;
  worst: { ticker: string; returnPercent: number } | null;
  byType: SignalTypePerformanceDto[];
}

export const MAX_CHART_IMAGES = 6;

const priceField = z.coerce.number().int().positive().max(100_000_000);

/** Written the way traders say it: risk of 1 against some multiple of reward. */
const riskRewardField = z
  .string()
  .trim()
  .regex(/^1:\d{1,3}(\.\d{1,2})?$/, 'Use the form "1:3"');

/**
 * Admin input for publishing a signal. The refinements below encode the
 * directional sanity of a long idea: you cannot enter above the top of your
 * own range, take profit below entry, or place a stop above it.
 */
export const createSignalSchema = z
  .object({
    // No company name: it is resolved from the stock list by ticker, so a
    // signal can only be published against a real listing.
    ticker: z.string().trim().toUpperCase().min(2).max(10),
    type: z.enum(["SWING", "TRADING", "POSITION"]),
    entryLow: priceField,
    entryHigh: priceField,
    currentPrice: priceField,
    target1: priceField,
    target2: z
      .union([priceField, z.literal(""), z.null()])
      .optional()
      .transform((value) => (value === "" || value === null || value === undefined ? null : value)),
    stopLoss: priceField,
    riskReward: riskRewardField,
    timeHorizon: z.string().trim().min(2).max(50),
    thesis: z.string().trim().min(10).max(4000),
    chartImages: z.array(z.string().trim().max(300)).max(MAX_CHART_IMAGES).default([]),
    keyCatalysts: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
    issuedAt: z.coerce.date().default(() => new Date()),
  })
  .refine((value) => value.entryHigh >= value.entryLow, {
    path: ["entryHigh"],
    message: "entryHigh must be at or above entryLow",
  })
  .refine((value) => value.target1 > value.entryHigh, {
    path: ["target1"],
    message: "target1 must be above the entry range",
  })
  .refine((value) => value.target2 === null || value.target2 > value.target1, {
    path: ["target2"],
    message: "target2 must be above target1",
  })
  .refine((value) => value.stopLoss < value.entryLow, {
    path: ["stopLoss"],
    message: "stopLoss must be below the entry range",
  });

export type CreateSignalInput = z.infer<typeof createSignalSchema>;

/** Admin update of the day's close. Status is re-derived from it, never sent. */
export const updateSignalPriceSchema = z.object({
  currentPrice: priceField,
});

export type UpdateSignalPriceInput = z.infer<typeof updateSignalPriceSchema>;

export interface StockOptionDto {
  ticker: string;
  name: string;
}

export const stocksQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : undefined)),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

export type StocksQuery = z.infer<typeof stocksQuerySchema>;
