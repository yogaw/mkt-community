import { NextResponse, type NextRequest } from "next/server";
import { marketIndexService } from "@/features/market-index/service/market-index-service";
import { createMarketIndexSchema } from "@/features/market-index/market-index-types";
import { requireAdmin, requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const snapshot = await marketIndexService.getLatest();

    return NextResponse.json({ data: snapshot }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Posts the day's close. Admin-only, enforced on the signed token. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const input = createMarketIndexSchema.parse(await request.json().catch(() => ({})));
    const snapshot = await marketIndexService.postSnapshot(input);

    return NextResponse.json({ data: snapshot }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
