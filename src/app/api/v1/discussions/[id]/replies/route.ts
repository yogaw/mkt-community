import { NextResponse, type NextRequest } from "next/server";
import { discussionService } from "@/features/discussion/service/discussion-service";
import { createReplySchema } from "@/features/discussion/discussion-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { id } = await params;
    const input = createReplySchema.parse(await request.json().catch(() => ({})));
    const thread = await discussionService.reply(id, claims.sub, input);

    return NextResponse.json({ data: thread }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
