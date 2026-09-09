import type { CategoryModel, VideoModel } from "@/database/prisma/models";
import { toEmbedUrl } from "@/features/videos/embed-url";
import type { CategoryDto, VideoCardDto, VideoDetailDto } from "@/features/videos/video-types";
import { truncate } from "@/lib/text/truncate";

const SHORT_DESCRIPTION_MAX_LENGTH = 120;

export function toVideoCardDto(video: VideoModel): VideoCardDto {
  return {
    id: video.id,
    title: video.title,
    shortDescription: truncate(video.description, SHORT_DESCRIPTION_MAX_LENGTH),
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
    publishedAt: video.publishedAt.toISOString(),
  };
}

export function toVideoDetailDto(video: VideoModel & { category: CategoryModel }): VideoDetailDto {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    provider: video.provider,
    embedUrl: toEmbedUrl(video.provider, video.videoUrl),
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
    category: toCategoryDto(video.category),
    publishedAt: video.publishedAt.toISOString(),
  };
}

export function toCategoryDto(category: CategoryModel): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}
