import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { newsService } from "@/features/updates/service/news-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

const newsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = newsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await newsService.listNews(query.page, query.pageSize);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
