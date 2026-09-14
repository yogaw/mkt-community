import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { updateThreadSchema } from "@/features/discussion/discussion-types";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const { id } = await params;
    // Opening a thread is what a view is. It counts opens rather than unique
    // readers, which the schema says out loud so nothing depends on it.
    const thread = await discussionService.getThread(id, viewer, true);

    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Edit, publish, archive, pin, feature and lock — admin only, in the service. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const { id } = await params;
    const input = updateThreadSchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.updateThread(id, viewer, input);

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
    await discussionService.deleteThread(id, viewer);

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
