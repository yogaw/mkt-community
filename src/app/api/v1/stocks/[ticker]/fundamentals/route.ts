import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stockAnalysisService } from "@/features/stock-analysis/service/stock-analysis-service";
import { tickerSchema } from "@/features/stock-analysis/stock-analysis-types";
import { FUNDAMENTAL_PERIODS } from "@/features/stock-analysis/fundamentals-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

const querySchema = z.object({ period: z.enum(FUNDAMENTAL_PERIODS).default("TTM") });

/**
 * Returns `data: null` when no provider reports this stock, which is the case
 * in production today. The tab renders an empty state rather than inventing
 * financials for a real company.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const ticker = tickerSchema.parse((await params).ticker);
    const { period } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const fundamentals = await stockAnalysisService.getFundamentals(ticker, period);

    return NextResponse.json({ data: fundamentals }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
