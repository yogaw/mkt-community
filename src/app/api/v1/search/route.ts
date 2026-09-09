import { NextResponse, type NextRequest } from "next/server";
import { searchService } from "@/features/search/service/search-service";
import { searchQuerySchema } from "@/features/search/search-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = searchQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await searchService.search(query.q, query.page);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
