import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { moderateReplySchema } from "@/features/discussion/discussion-types";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

/** Hide or restore a comment. Admin only, enforced in the service. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const { replyId } = await params;
    const input = moderateReplySchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.moderateComment(replyId, viewer, input);

    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Authors may retract their own comment; admins may remove any. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const { replyId } = await params;
    const thread = await discussionService.deleteComment(replyId, viewer);

    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
