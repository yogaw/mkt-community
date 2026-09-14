import { NextResponse, type NextRequest } from "next/server";
import { stockAnalysisService } from "@/features/stock-analysis/service/stock-analysis-service";
import { tickerSchema } from "@/features/stock-analysis/stock-analysis-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/** Header, profile, and the links into Signals and Discussion for one stock. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const ticker = tickerSchema.parse((await params).ticker);
    const overview = await stockAnalysisService.getOverview(ticker, claims.sub);

    return NextResponse.json({ data: overview }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
