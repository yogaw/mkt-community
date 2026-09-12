import { NextResponse, type NextRequest } from "next/server";
import { signalService } from "@/features/signals/service/signal-service";
import { updateSignalPriceSchema } from "@/features/signals/signal-types";
import { requireAdmin } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

/** Posts the day's close. Status is re-derived from it server-side. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const claims = await requireAdmin(request);

    const { id } = await params;
    const input = updateSignalPriceSchema.parse(await request.json().catch(() => ({})));
    const signal = await signalService.updateSignalPrice(id, input, claims.sub);

    return NextResponse.json({ data: signal }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
