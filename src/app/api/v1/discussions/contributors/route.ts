import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { requireViewer } from "@/lib/api/viewer";
import { toErrorResponse } from "@/lib/api/response";

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

/**
 * The full participation ranking, behind the sidebar card's "View all".
 *
 * A static segment, so it is matched before /discussions/[id]; `toSlug` keeps
 * "contributors" off the list of slugs a thread can be given.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Sign-in is the only gate; the ranking is the same for every member.
    await requireViewer(request);

    const { limit } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const contributors = await discussionService.listContributors(limit);

    return NextResponse.json({ data: contributors }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
