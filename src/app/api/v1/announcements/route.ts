import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { announcementService } from "@/features/updates/service/announcement-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

const announcementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = announcementsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await announcementService.listAnnouncements(query.page, query.pageSize);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
