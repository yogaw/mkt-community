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
export type SignalRisk = "LOW" | "MEDIUM" | "HIGH";
export type SignalPositionSize = "SMALL" | "NORMAL" | "LARGE";
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
  riskLevel: SignalRisk;
  positionSize: SignalPositionSize;
  timeHorizon: string;
  thesis: string;
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
