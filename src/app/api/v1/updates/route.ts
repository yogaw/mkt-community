import { NextResponse, type NextRequest } from "next/server";
import { updatesService } from "@/features/updates/service/updates-service";
import { updatesQuerySchema } from "@/features/updates/update-types";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = updatesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await updatesService.listUpdates(query);

    return NextResponse.json(
      { data: result.items, pagination: result.pagination },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
