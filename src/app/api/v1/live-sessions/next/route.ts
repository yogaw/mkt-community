import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { liveSessionService } from "@/features/live-sessions/service/live-session-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const session = await liveSessionService.getNextUpcomingSession();

    if (!session) {
      throw new AppError(404, ErrorCode.notFound);
    }

    return NextResponse.json({ data: session }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
