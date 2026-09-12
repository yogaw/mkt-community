import { NextResponse, type NextRequest } from "next/server";
import { newsSectionService } from "@/features/news/service/news-section-service";
import { calendarQuerySchema } from "@/features/news/news-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = calendarQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await newsSectionService.listCalendarEvents(query);

    return NextResponse.json({ data: result.items, pagination: result.pagination }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
