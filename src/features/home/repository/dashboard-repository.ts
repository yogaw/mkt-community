import { db } from "@/database";
import type { AnnouncementModel, CategoryModel, NewsModel, VideoModel } from "@/database/prisma/models";

export type NewsWithCategory = NewsModel & { category: CategoryModel };

export type FeaturedContentRow =
  | { kind: "video"; item: VideoModel }
  | { kind: "announcement"; item: AnnouncementModel }
  | { kind: "news"; item: NewsWithCategory };

export type UpdateRow =
  | { kind: "news"; item: NewsWithCategory }
  | { kind: "announcement"; item: AnnouncementModel };

export interface DashboardRepository {
  findFeaturedContent(): Promise<FeaturedContentRow | null>;
  findLatestVideos(limit: number): Promise<VideoModel[]>;
  findLatestUpdates(limit: number): Promise<UpdateRow[]>;
}

export class PrismaDashboardRepository implements DashboardRepository {
  async findFeaturedContent(): Promise<FeaturedContentRow | null> {
    const [video, announcement, news] = await Promise.all([
      db.video.findFirst({
        where: { isFeatured: true, deletedAt: null },
        orderBy: { publishedAt: "desc" },
      }),
      db.announcement.findFirst({
        where: { isFeatured: true, deletedAt: null },
        orderBy: { publishedAt: "desc" },
      }),
      db.news.findFirst({
        where: { isFeatured: true, deletedAt: null },
        orderBy: { publishedAt: "desc" },
        include: { category: true },
      }),
    ]);

    const candidates = [
      video && { publishedAt: video.publishedAt, row: { kind: "video", item: video } as const },
      announcement && { publishedAt: announcement.publishedAt, row: { kind: "announcement", item: announcement } as const },
      news && { publishedAt: news.publishedAt, row: { kind: "news", item: news } as const },
    ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

    candidates.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return candidates[0]?.row ?? null;
  }

  async findLatestVideos(limit: number): Promise<VideoModel[]> {
    return db.video.findMany({
      where: { deletedAt: null },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }

  async findLatestUpdates(limit: number): Promise<UpdateRow[]> {
    const [news, announcements] = await Promise.all([
      db.news.findMany({
        where: { deletedAt: null },
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: { category: true },
      }),
      db.announcement.findMany({
        where: { deletedAt: null },
        orderBy: { publishedAt: "desc" },
        take: limit,
      }),
    ]);

    const merged = [
      ...news.map((item) => ({ publishedAt: item.publishedAt, row: { kind: "news", item } as const })),
      ...announcements.map((item) => ({ publishedAt: item.publishedAt, row: { kind: "announcement", item } as const })),
    ];

    return merged
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit)
      .map((entry) => entry.row);
  }
}

export const dashboardRepository: DashboardRepository = new PrismaDashboardRepository();
