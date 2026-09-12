import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";
import { UserRoleKind } from "@/database/prisma/enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    const thread = await discussionService.getThread(id, claims.sub);

    return NextResponse.json({ data: thread }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Authors may retract their own thread; admins may remove any. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    await discussionService.deleteThread(id, claims.sub, claims.role === UserRoleKind.ADMIN);

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
