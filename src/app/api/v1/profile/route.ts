import { NextResponse, type NextRequest } from "next/server";
import { profileService } from "@/features/profile/service/profile-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = await requireAuth(request);
    const profile = await profileService.getProfile(claims.sub);

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
