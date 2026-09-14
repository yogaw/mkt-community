import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { createReplySchema } from "@/features/discussion/discussion-types";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

/** Any signed-in member may comment; only admins may start the thread. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const { id } = await params;
    const input = createReplySchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.comment(id, viewer, input);

    return NextResponse.json({ data: thread }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
