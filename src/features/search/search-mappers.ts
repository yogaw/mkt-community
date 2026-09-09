import type { AnnouncementModel, NewsModel, VideoModel } from "@/database/prisma/models";
import { formatDate, formatDuration } from "@/lib/datetime/format";
import type { SearchResultItemDto } from "./search-types";

export function toVideoSearchItem(video: VideoModel): SearchResultItemDto {
  return {
    kind: "video",
    id: video.id,
    title: video.title,
    subtitle: `${formatDuration(video.durationSeconds)} · ${formatDate(video.publishedAt)}`,
    publishedAt: video.publishedAt.toISOString(),
  };
}

export function toNewsSearchItem(news: NewsModel): SearchResultItemDto {
  return {
    kind: "news",
    id: news.id,
    title: news.title,
    subtitle: formatDate(news.publishedAt),
    publishedAt: news.publishedAt.toISOString(),
  };
}

export function toAnnouncementSearchItem(announcement: AnnouncementModel): SearchResultItemDto {
  return {
    kind: "announcement",
    id: announcement.id,
    title: announcement.title,
    subtitle: formatDate(announcement.publishedAt),
    publishedAt: announcement.publishedAt.toISOString(),
  };
}
