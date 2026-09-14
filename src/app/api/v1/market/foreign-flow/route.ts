import { NextResponse, type NextRequest } from "next/server";
import { marketOverviewService } from "@/features/market-overview/service/market-overview-service";
import { foreignFlowQuerySchema } from "@/features/market-overview/market-overview-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/** Daily foreign net flow with the matching IHSG close, oldest first. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = foreignFlowQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await marketOverviewService.getForeignFlowSeries(query);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
