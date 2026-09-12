import { db } from "@/database";
import type { EbookModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { CreateEbookInput, EbooksQuery } from "@/features/ebooks/ebook-types";

export interface EbookRepository {
  findMany(query: EbooksQuery): Promise<PaginatedResult<EbookModel>>;
  findById(id: string): Promise<EbookModel | null>;
  create(input: CreateEbookInput, fileName: string, fileSizeBytes: number): Promise<EbookModel>;
}

export class PrismaEbookRepository implements EbookRepository {
  async findMany(query: EbooksQuery): Promise<PaginatedResult<EbookModel>> {
    const where = {
      deletedAt: null,
      ...(query.tag ? { tag: query.tag } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { source: { contains: query.search, mode: "insensitive" as const } },
              { tickers: { has: query.search.toUpperCase() } },
            ],
          }
        : {}),
    };

    const [totalItems, items] = await Promise.all([
      db.ebook.count({ where }),
      db.ebook.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  async findById(id: string): Promise<EbookModel | null> {
    return db.ebook.findFirst({ where: { id, deletedAt: null } });
  }

  async create(
    input: CreateEbookInput,
    fileName: string,
    fileSizeBytes: number,
  ): Promise<EbookModel> {
    return db.ebook.create({ data: { ...input, fileName, fileSizeBytes } });
  }
}

export const ebookRepository: EbookRepository = new PrismaEbookRepository();
