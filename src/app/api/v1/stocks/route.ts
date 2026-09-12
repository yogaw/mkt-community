import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { stocksQuerySchema } from "@/features/signals/signal-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = stocksQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const stocks = await signalService.listStocks(query);

    return NextResponse.json({ data: stocks }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
