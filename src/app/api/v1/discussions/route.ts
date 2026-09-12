import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { createThreadSchema, threadsQuerySchema } from "@/features/discussion/discussion-types";
import { requireAdmin } from "@/lib/api/auth";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";
import { UserRoleKind } from "@/database/prisma/enums";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const viewer = await requireViewer(request);

    const query = threadsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    // The overview travels with the list: the board renders both together, and
    // two round trips would let the counts disagree with the rows beneath them.
    const [result, overview] = await Promise.all([
      discussionService.listThreads(query, viewer),
      discussionService.getOverview(viewer),
    ]);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination, overview },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Admin only. This is the enforcement — hiding the button is a convenience,
 * and a member posting straight to this endpoint gets a 403 from the token's
 * own role claim.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = await requireAdmin(request);

    const input = createThreadSchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.createThread(
      { id: claims.sub, isAdmin: claims.role === UserRoleKind.ADMIN },
      input,
    );

    return NextResponse.json({ data: thread }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
