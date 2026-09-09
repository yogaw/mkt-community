import { db } from "@/database";
import type { AnnouncementModel, CategoryModel, NewsModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { UpdatesFilter } from "@/features/updates/update-types";

export type NewsWithCategory = NewsModel & { category: CategoryModel };

export type UpdateRow =
  | { kind: "news"; item: NewsWithCategory }
  | { kind: "announcement"; item: AnnouncementModel };

export interface UpdatesRepository {
  findManyMerged(filter: UpdatesFilter): Promise<PaginatedResult<UpdateRow>>;
}

export class PrismaUpdatesRepository implements UpdatesRepository {
  async findManyMerged(filter: UpdatesFilter): Promise<PaginatedResult<UpdateRow>> {
    const [news, announcements] = await Promise.all([
      db.news.findMany({
        where: { deletedAt: null },
        orderBy: { publishedAt: "desc" },
        include: { category: true },
      }),
      db.announcement.findMany({
        where: { deletedAt: null },
        orderBy: { publishedAt: "desc" },
      }),
    ]);

    const rows: UpdateRow[] = [
      ...news.map((item) => ({ kind: "news" as const, item })),
      ...announcements.map((item) => ({ kind: "announcement" as const, item })),
    ].filter((row) => filter.type === "all" || row.kind === filter.type);

    rows.sort((a, b) => b.item.publishedAt.getTime() - a.item.publishedAt.getTime());

    const start = (filter.page - 1) * filter.pageSize;
    const totalItems = rows.length;

    return {
      items: rows.slice(start, start + filter.pageSize),
      pagination: {
        page: filter.page,
        pageSize: filter.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.pageSize),
      },
    };
  }
}

export const updatesRepository: UpdatesRepository = new PrismaUpdatesRepository();
