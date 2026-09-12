import { NextResponse, type NextRequest } from "next/server";
import { marketOverviewService } from "@/features/market-overview/service/market-overview-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/** The most recent ingested trading day, which on a Saturday is Friday. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);
    const summary = await marketOverviewService.getSummary();
    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
