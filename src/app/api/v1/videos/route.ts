import { NextResponse, type NextRequest } from "next/server";
import { videoService } from "@/features/videos/service/video-service";
import { videosQuerySchema } from "@/features/videos/video-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = videosQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await videoService.listVideos(query);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
