import { db } from "@/database";
import type { AnnouncementModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";

export interface AnnouncementRepository {
  findById(id: string): Promise<AnnouncementModel | null>;
  findMany(page: number, pageSize: number): Promise<PaginatedResult<AnnouncementModel>>;
}

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  async findById(id: string): Promise<AnnouncementModel | null> {
    return db.announcement.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findMany(page: number, pageSize: number): Promise<PaginatedResult<AnnouncementModel>> {
    const where = { deletedAt: null };

    const [totalItems, items] = await Promise.all([
      db.announcement.count({ where }),
      db.announcement.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }
}

export const announcementRepository: AnnouncementRepository = new PrismaAnnouncementRepository();
