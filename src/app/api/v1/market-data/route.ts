import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { instrumentService } from "@/features/market-data/service/instrument-service";
import { MARKET_SECTIONS } from "@/features/market-data/market-data-model";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

const querySchema = z.object({ section: z.enum(MARKET_SECTIONS).default("global") });

/**
 * The only market-data endpoint the browser knows. Which provider sits behind a
 * given instrument is decided server-side, so the frontend never talks to a
 * vendor and never learns one exists.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await instrumentService.listBySection(query.section);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
