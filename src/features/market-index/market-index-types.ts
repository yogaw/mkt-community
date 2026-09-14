import { z } from "zod";

export interface MarketIndexSnapshotDto {
  id: string;
  indexName: string;
  value: number;
  changePercent: number;
  /** Whole rupiah; the UI abbreviates. Foreign flow is negative on an outflow. */
  turnoverIdr: number;
  foreignFlowIdr: number;
  advancers: number;
  decliners: number;
  capturedAt: string;
}

/**
 * Admin input for the day's close. Turnover and flow are entered in whole
 * rupiah so nothing about the display format leaks into storage.
 */
export const createMarketIndexSchema = z.object({
  indexName: z.string().trim().min(2).max(20).default("IHSG"),
  value: z.coerce.number().positive().max(1_000_000),
  changePercent: z.coerce.number().min(-100).max(100),
  turnoverIdr: z.coerce.number().nonnegative().max(1e21),
  foreignFlowIdr: z.coerce.number().min(-1e21).max(1e21),
  advancers: z.coerce.number().int().min(0).max(10_000),
  decliners: z.coerce.number().int().min(0).max(10_000),
  capturedAt: z.coerce.date().default(() => new Date()),
});

export type CreateMarketIndexInput = z.infer<typeof createMarketIndexSchema>;
