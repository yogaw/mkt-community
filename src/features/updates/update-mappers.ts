import type { AnnouncementModel } from "@/database/prisma/models";
import type {
  AnnouncementDetailDto,
  AnnouncementSummaryDto,
  NewsDetailDto,
  NewsSummaryDto,
  UpdateFeedItemDto,
} from "@/features/updates/update-types";
import type { NewsWithCategory, UpdateRow } from "@/features/updates/repository/updates-repository";
import { toCategoryDto } from "@/features/videos/video-mappers";
import { truncate } from "@/lib/text/truncate";

const SNIPPET_MAX_LENGTH = 140;

export function toUpdateFeedItem(row: UpdateRow): UpdateFeedItemDto {
  return {
    kind: row.kind,
    id: row.item.id,
    title: row.item.title,
    snippet: toSnippet(row),
    badgeLabel: toBadgeLabel(row),
    publishedAt: row.item.publishedAt.toISOString(),
  };
}

function toSnippet(row: UpdateRow): string {
  return row.kind === "news" ? row.item.summary : truncate(row.item.content, SNIPPET_MAX_LENGTH);
}

function toBadgeLabel(row: UpdateRow): string {
  return row.kind === "news" ? row.item.category.name : "Announcement";
}

export function toNewsSummaryDto(news: NewsWithCategory): NewsSummaryDto {
  return {
    id: news.id,
    title: news.title,
    summary: news.summary,
    imageUrl: news.imageUrl,
    category: toCategoryDto(news.category),
    publishedAt: news.publishedAt.toISOString(),
  };
}

export function toNewsDetailDto(news: NewsWithCategory): NewsDetailDto {
  return {
    id: news.id,
    title: news.title,
    content: news.content,
    imageUrl: news.imageUrl,
    category: toCategoryDto(news.category),
    publishedAt: news.publishedAt.toISOString(),
  };
}

export function toAnnouncementSummaryDto(announcement: AnnouncementModel): AnnouncementSummaryDto {
  return {
    id: announcement.id,
    title: announcement.title,
    snippet: truncate(announcement.content, SNIPPET_MAX_LENGTH),
    publishedAt: announcement.publishedAt.toISOString(),
  };
}

export function toAnnouncementDetailDto(announcement: AnnouncementModel): AnnouncementDetailDto {
  const hasCta = Boolean(announcement.ctaLabel && announcement.ctaUrl);

  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    ctaLabel: hasCta ? announcement.ctaLabel : null,
    ctaUrl: hasCta ? announcement.ctaUrl : null,
    publishedAt: announcement.publishedAt.toISOString(),
  };
}
