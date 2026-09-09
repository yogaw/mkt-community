import { db } from "@/database";
import type { UserModel } from "@/database/prisma/models";

export interface UserRepository {
  findById(id: string): Promise<UserModel | null>;
}

export class PrismaUserRepository implements UserRepository {
  findById(id: string): Promise<UserModel | null> {
    return db.user.findFirst({
      where: { id, deletedAt: null },
    });
  }
}

export const userRepository: UserRepository = new PrismaUserRepository();
