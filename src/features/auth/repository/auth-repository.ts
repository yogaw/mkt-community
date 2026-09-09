import { db } from "@/database";
import type { UserModel } from "@/database/prisma/models";

export interface AuthRepository {
  findByEmail(email: string): Promise<UserModel | null>;
}

export class PrismaAuthRepository implements AuthRepository {
  async findByEmail(email: string): Promise<UserModel | null> {
    return db.user.findFirst({
      where: { email, deletedAt: null },
    });
  }
}

export const authRepository: AuthRepository = new PrismaAuthRepository();
