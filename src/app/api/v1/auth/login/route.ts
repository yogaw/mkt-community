import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/features/auth/auth-types";
import { authService } from "@/features/auth/service/auth-service";
import { toErrorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const input = loginSchema.parse(body);
    const result = await authService.login(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
