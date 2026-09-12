import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stockAnalysisService } from "@/features/stock-analysis/service/stock-analysis-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

const querySchema = z.object({
  q: z.string().trim().max(40).optional(),
  /** "watchlist" reads the member's existing signal watchlist. */
  list: z.enum(["active", "watchlist"]).default("active"),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * Stock discovery for the Stock Analysis landing page.
 *
 * A static segment, so it is matched before /stocks/[ticker]; `tickerSchema`
 * would reject "search" anyway, but the ordering is what makes it work.
 * With no term, returns the most active names by value traded.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);

    const { q, list, limit } = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const [results, coverage] = await Promise.all([
      q
        ? stockAnalysisService.search(q, limit)
        : list === "watchlist"
          ? stockAnalysisService.watchlist(claims.sub, limit)
          : stockAnalysisService.mostActive(limit),
      stockAnalysisService.coverage(),
    ]);

    return NextResponse.json({ data: results, coverage }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
