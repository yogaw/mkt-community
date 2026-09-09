import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Stateless JWT for MVP: the server holds no session to revoke, so a
    // valid token is all that is required and the client discards its copy.
    await requireAuth(request);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
