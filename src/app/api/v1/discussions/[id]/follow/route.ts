import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

/**
 * Follow state is stored and surfaced; nothing is delivered. The app has no
 * notification infrastructure, and this endpoint is the boundary a future one
 * would read from rather than a parallel system built alongside it.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);
    const { id } = await params;
    const thread = await discussionService.setFollow(id, viewer, true);
    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);
    const { id } = await params;
    const thread = await discussionService.setFollow(id, viewer, false);
    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
