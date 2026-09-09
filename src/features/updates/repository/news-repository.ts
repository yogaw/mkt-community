import { db } from "@/database";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { NewsWithCategory } from "@/features/updates/repository/updates-repository";

export interface NewsRepository {
  findById(id: string): Promise<NewsWithCategory | null>;
  findMany(page: number, pageSize: number): Promise<PaginatedResult<NewsWithCategory>>;
}

export class PrismaNewsRepository implements NewsRepository {
  async findById(id: string): Promise<NewsWithCategory | null> {
    return db.news.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
  }

  async findMany(page: number, pageSize: number): Promise<PaginatedResult<NewsWithCategory>> {
    const where = { deletedAt: null };

    const [totalItems, items] = await Promise.all([
      db.news.count({ where }),
      db.news.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
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

export const newsRepository: NewsRepository = new PrismaNewsRepository();
