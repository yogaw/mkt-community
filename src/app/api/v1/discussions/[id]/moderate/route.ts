import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { moderateThreadSchema } from "@/features/discussion/discussion-types";
import { requireAdmin } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/** Pin or lock a thread. Admin-only, enforced on the signed token. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const input = moderateThreadSchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.moderate(id, input);

    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
