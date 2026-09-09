import { NextResponse, type NextRequest } from "next/server";
import { dashboardService } from "@/features/home/service/dashboard-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const feed = await dashboardService.getHomeFeed();

    return NextResponse.json(feed, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
