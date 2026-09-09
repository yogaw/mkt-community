import { NextResponse, type NextRequest } from "next/server";
import { newsService } from "@/features/updates/service/news-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const { id } = await params;
    const news = await newsService.getNewsById(id);

    return NextResponse.json({ data: news }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
