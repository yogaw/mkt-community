import type { NextRequest } from "next/server";
import { UserRoleKind } from "@/database/prisma/enums";
import { verifyAccessToken, type AccessTokenClaims } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";

const BEARER_PREFIX = "Bearer ";

export async function requireAuth(request: NextRequest): Promise<AccessTokenClaims> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw new AppError(401, ErrorCode.unauthorized);
  }

  try {
    return await verifyAccessToken(header.slice(BEARER_PREFIX.length));
  } catch {
    throw new AppError(401, ErrorCode.unauthorized);
  }
}

/**
 * Admin-only gate for write endpoints. The role comes from the signed token
 * rather than anything the client sends, so hiding a control in the UI is a
 * convenience and this is the actual enforcement.
 */
export async function requireAdmin(request: NextRequest): Promise<AccessTokenClaims> {
  const claims = await requireAuth(request);

  if (claims.role !== UserRoleKind.ADMIN) {
    throw new AppError(403, ErrorCode.forbidden);
  }

  return claims;
}
