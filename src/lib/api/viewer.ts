import type { NextRequest } from "next/server";
import { UserRoleKind } from "@/database/prisma/enums";
import { requireAuth } from "@/lib/api/auth";

export interface Viewer {
  id: string;
  isAdmin: boolean;
}

/**
 * The signed-in caller, with the role taken from the signed token rather than
 * anything the client sends. Services take this instead of a bare user id so a
 * permission check cannot be skipped by forgetting to pass a flag.
 */
export async function requireViewer(request: NextRequest): Promise<Viewer> {
  const claims = await requireAuth(request);
  return { id: claims.sub, isAdmin: claims.role === UserRoleKind.ADMIN };
}
