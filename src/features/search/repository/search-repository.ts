import { db } from "@/database";
import type { AnnouncementModel, NewsModel, VideoModel } from "@/database/prisma/models";

export interface SearchRepository {
  searchVideos(term: string, limit: number): Promise<VideoModel[]>;
  searchNews(term: string, limit: number): Promise<NewsModel[]>;
  searchAnnouncements(term: string, limit: number): Promise<AnnouncementModel[]>;
}

export class PrismaSearchRepository implements SearchRepository {
  searchVideos(term: string, limit: number): Promise<VideoModel[]> {
    return db.video.findMany({
      where: { title: { contains: term, mode: "insensitive" }, deletedAt: null },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }

  searchNews(term: string, limit: number): Promise<NewsModel[]> {
    return db.news.findMany({
      where: { title: { contains: term, mode: "insensitive" }, deletedAt: null },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }

  searchAnnouncements(term: string, limit: number): Promise<AnnouncementModel[]> {
    return db.announcement.findMany({
      where: { title: { contains: term, mode: "insensitive" }, deletedAt: null },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }
}

export const searchRepository: SearchRepository = new PrismaSearchRepository();
