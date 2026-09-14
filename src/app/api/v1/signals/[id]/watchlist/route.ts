import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    await signalService.setWatchlisted(claims.sub, id, true);

    return NextResponse.json({ data: { watchlisted: true } }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    await signalService.setWatchlisted(claims.sub, id, false);

    return NextResponse.json({ data: { watchlisted: false } }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
