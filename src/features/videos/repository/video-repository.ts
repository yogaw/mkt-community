import { db } from "@/database";
import type { CategoryModel, VideoModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { VideoFilter } from "@/features/videos/video-types";

export interface VideoRepository {
  findMany(filter: VideoFilter): Promise<PaginatedResult<VideoModel>>;
  findManyCategoriesWithVideos(): Promise<CategoryModel[]>;
  findById(id: string): Promise<(VideoModel & { category: CategoryModel }) | null>;
}

export class PrismaVideoRepository implements VideoRepository {
  async findMany(filter: VideoFilter): Promise<PaginatedResult<VideoModel>> {
    const where = {
      deletedAt: null,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.search ? { title: { contains: filter.search, mode: "insensitive" as const } } : {}),
    };

    const [totalItems, items] = await Promise.all([
      db.video.count({ where }),
      db.video.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
    ]);

    return {
      items,
      pagination: {
        page: filter.page,
        pageSize: filter.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.pageSize),
      },
    };
  }

  async findManyCategoriesWithVideos(): Promise<CategoryModel[]> {
    return db.category.findMany({
      where: { video: { some: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<(VideoModel & { category: CategoryModel }) | null> {
    return db.video.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
  }
}

export const videoRepository: VideoRepository = new PrismaVideoRepository();
