import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    const signal = await signalService.getSignalById(id, claims.sub);

    return NextResponse.json({ data: signal }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
