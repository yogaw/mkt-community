import { NextResponse, type NextRequest } from "next/server";
import { announcementService } from "@/features/updates/service/announcement-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const { id } = await params;
    const announcement = await announcementService.getAnnouncementById(id);

    return NextResponse.json({ data: announcement }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
