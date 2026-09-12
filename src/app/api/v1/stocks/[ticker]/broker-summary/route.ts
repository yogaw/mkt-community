import { NextResponse, type NextRequest } from "next/server";
import { stockAnalysisService } from "@/features/stock-analysis/service/stock-analysis-service";
import {
  brokerSummaryQuerySchema,
  tickerSchema,
} from "@/features/stock-analysis/stock-analysis-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/**
 * Normalized broker statistics for one stock over one period.
 *
 * Everything is aggregated before it leaves here: the browser receives daily
 * totals, per-broker totals and summary metrics, never a transaction row.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const ticker = tickerSchema.parse((await params).ticker);
    const query = brokerSummaryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const summary = await stockAnalysisService.getBrokerSummary(ticker, query);

    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
