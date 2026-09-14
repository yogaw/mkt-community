import { z } from "zod";

/**
 * UNITS — verified against IDX on 2026-09-12, see docs/idx-market-data.md.
 *   ihsg.*            index points
 *   *.volume          SHARES. IDX publishes shares, not lots; divide by 100 for lots.
 *   *.value, *Value   IDR
 *   frequency         trade count
 */
export const MARKET_SCOPES = ["REGULAR", "ALL"] as const;
export type MarketScope = (typeof MARKET_SCOPES)[number];

export const DEFAULT_FLOW_DAYS = 30;

export interface IhsgDto {
  close: number;
  /** Prior session's close. IDX publishes no Open for an index. */
  previous: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  marketCapital: number | null;
  numberOfStock: number | null;
}

export interface MarketActivityDto {
  volume: number | null;
  value: number | null;
  /** Null for the Regular scope: see the note in the repository. */
  frequency: number | null;
}

export interface ForeignFlowDto {
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  /** Whole-scope turnover, so the UI can express net flow as a share of it. */
  totalValue: number;
}

export interface MarketSummaryDto {
  date: string;
  ihsg: IhsgDto;
  activity: Record<Lowercase<MarketScope>, MarketActivityDto>;
  foreign: Record<Lowercase<MarketScope>, ForeignFlowDto | null>;
  /** Trading-day navigation; null at either end of what we hold. */
  previousDate: string | null;
  nextDate: string | null;
  latestDate: string;
}

export interface ForeignFlowPointDto {
  date: string;
  netValue: number;
  buyValue: number;
  sellValue: number;
  totalValue: number;
  ihsgClose: number | null;
  ihsgChangePercent: number | null;
}

export const marketDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const foreignFlowQuerySchema = z.object({
  scope: z.enum(MARKET_SCOPES).default("REGULAR"),
  /** Trading days back from the latest stored date, not calendar days. */
  days: z.coerce.number().int().min(2).max(500).default(DEFAULT_FLOW_DAYS),
  from: marketDateSchema.optional(),
  to: marketDateSchema.optional(),
});

export type ForeignFlowQuery = z.infer<typeof foreignFlowQuerySchema>;
