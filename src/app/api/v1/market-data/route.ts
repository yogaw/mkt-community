import { NextResponse, type NextRequest } from "next/server";
import { marketDataService } from "@/features/market-data/service/market-data-service";
import { marketDataQuerySchema } from "@/features/market-data/market-data-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = marketDataQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await marketDataService.listIndicators(query);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
