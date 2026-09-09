import { NextResponse, type NextRequest } from "next/server";
import { videoService } from "@/features/videos/service/video-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const { id } = await params;
    const video = await videoService.getVideoById(id);

    return NextResponse.json({ data: video }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
