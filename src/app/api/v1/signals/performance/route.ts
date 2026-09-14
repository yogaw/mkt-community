import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const performance = await signalService.getPerformance();

    return NextResponse.json({ data: performance }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
