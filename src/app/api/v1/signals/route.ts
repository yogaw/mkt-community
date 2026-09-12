import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { signalsQuerySchema } from "@/features/signals/signal-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const query = signalsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await signalService.listSignals({ ...query, userId: claims.sub });

    return NextResponse.json(
      { data: result.items, pagination: result.pagination, stats: result.stats },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
