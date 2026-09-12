import { z } from "zod";
import {
  INDICATOR_GROUPS,
  type IndicatorCategory,
  type IndicatorGroup,
  type IndicatorUnit,
} from "@/features/market-data/indicator-catalogue";

export interface MarketIndicatorDto {
  code: string;
  label: string;
  description: string;
  group: IndicatorGroup;
  category: IndicatorCategory;
  unit: IndicatorUnit;
  decimals: number;
  /** True where a rise reads as risk-off — yields, the dollar, volatility. */
  invertTone: boolean;
  latest: number;
  latestDate: string;
  /** Null when there is no prior session to compare against. */
  dailyChangePercent: number | null;
  monthChangePercent: number | null;
  /** Closes over the trend window, oldest first, for the sparkline. */
  spark: number[];
}

export const marketDataQuerySchema = z.object({
  group: z.enum(INDICATOR_GROUPS).optional(),
});

export type MarketDataQuery = z.infer<typeof marketDataQuerySchema>;
