import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);
    const { id } = await params;
    const thread = await discussionService.setThreadLike(id, viewer, true);
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
    const thread = await discussionService.setThreadLike(id, viewer, false);
    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
