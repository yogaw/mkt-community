import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { UserModel } from "@/database/prisma/models";
import type { MembershipStatus, ProfileDto } from "@/features/profile/profile-types";
import type { UserRepository } from "@/features/profile/repository/user-repository";
import { userRepository } from "@/features/profile/repository/user-repository";

export interface ProfileService {
  getProfile(userId: string): Promise<ProfileDto>;
}

export class ProfileServiceImpl implements ProfileService {
  constructor(private readonly repository: UserRepository) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new AppError(401, ErrorCode.unauthorized);
    }

    return toProfileDto(user);
  }
}

function toProfileDto(user: UserModel): ProfileDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    membershipStatus: user.membershipStatus as MembershipStatus,
  };
}

export const profileService: ProfileService = new ProfileServiceImpl(userRepository);
