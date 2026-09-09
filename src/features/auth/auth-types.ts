import { z } from "zod";
import type { MembershipStatusKind, UserRoleKind } from "@/database/prisma/enums";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleKind;
  membershipStatus: MembershipStatusKind;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}
