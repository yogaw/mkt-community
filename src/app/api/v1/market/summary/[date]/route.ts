import { NextResponse, type NextRequest } from "next/server";
import { marketOverviewService } from "@/features/market-overview/service/market-overview-service";
import { marketDateSchema } from "@/features/market-overview/market-overview-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const { date } = await params;
    const summary = await marketOverviewService.getSummary(marketDateSchema.parse(date));

    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
