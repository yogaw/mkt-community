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
  /** Prior session's close, which the chart draws as a reference line. */
  previousClose: number | null;
  changeAbsolute: number | null;
  /** The latest session's own range. Null where the vendor sends no OHLC. */
  dayHigh: number | null;
  dayLow: number | null;
  /** Over whatever history we hold, which is a year once backfilled. */
  week52High: number | null;
  week52Low: number | null;
  /** Full series, oldest first. The client slices it per range button. */
  series: Array<{ date: string; close: number }>;
}

export const marketDataQuerySchema = z.object({
  group: z.enum(INDICATOR_GROUPS).optional(),
});

export type MarketDataQuery = z.infer<typeof marketDataQuerySchema>;
