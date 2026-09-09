import { z } from "zod";

export const DEFAULT_VIDEOS_PAGE_SIZE = 12;

export const videosQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  categoryId: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(DEFAULT_VIDEOS_PAGE_SIZE),
});

export type VideosQuery = z.infer<typeof videosQuerySchema>;

export interface VideoFilter {
  search?: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface VideoCardDto {
  id: string;
  title: string;
  shortDescription: string;
  thumbnailUrl: string;
  durationSeconds: number;
  publishedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface VideoDetailDto {
  id: string;
  title: string;
  description: string;
  provider: "UPLOAD" | "VIMEO" | "YOUTUBE" | "OTHER";
  embedUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  category: CategoryDto;
  publishedAt: string;
}
