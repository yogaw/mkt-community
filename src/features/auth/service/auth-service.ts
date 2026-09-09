import type { UserModel } from "@/database/prisma/models";
import { MembershipStatusKind, UserRoleKind } from "@/database/prisma/enums";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { signAccessToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import type { AuthenticatedUser, LoginInput, LoginResult } from "../auth-types";
import { authRepository, type AuthRepository } from "../repository/auth-repository";

export interface AuthService {
  login(input: LoginInput): Promise<LoginResult>;
}

export class AuthServiceImpl implements AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.repository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, ErrorCode.invalidCredentials);
    }

    this.assertMembershipActive(user);

    const passwordMatches = await verifyPassword(input.password, user.password);
    if (!passwordMatches) {
      throw new AppError(401, ErrorCode.invalidCredentials);
    }

    return {
      accessToken: await signAccessToken({ sub: user.id, role: user.role }),
      user: toAuthenticatedUser(user),
    };
  }

  private assertMembershipActive(user: UserModel): void {
    if (user.role === UserRoleKind.ADMIN) {
      return;
    }
    if (user.membershipStatus !== MembershipStatusKind.ACTIVE) {
      throw new AppError(403, ErrorCode.membershipInactive);
    }
  }
}

function toAuthenticatedUser(user: UserModel): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    membershipStatus: user.membershipStatus,
  };
}

export const authService: AuthService = new AuthServiceImpl(authRepository);
