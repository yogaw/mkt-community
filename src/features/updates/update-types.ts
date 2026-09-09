import { z } from "zod";
import type { CategoryDto } from "@/features/videos/video-types";

export type UpdateKind = "news" | "announcement";

export const DEFAULT_UPDATES_PAGE_SIZE = 10;

export const updatesQuerySchema = z.object({
  type: z.enum(["all", "news", "announcement"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(DEFAULT_UPDATES_PAGE_SIZE),
});

export type UpdatesQuery = z.infer<typeof updatesQuerySchema>;

export interface UpdatesFilter {
  type: "all" | UpdateKind;
  page: number;
  pageSize: number;
}

export interface UpdateFeedItemDto {
  kind: UpdateKind;
  id: string;
  title: string;
  /** Present on the updates feed; the home dashboard omits it. */
  snippet?: string;
  badgeLabel: string;
  publishedAt: string;
}

export interface NewsSummaryDto {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  category: CategoryDto;
  publishedAt: string;
}

export interface NewsDetailDto {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  category: CategoryDto;
  publishedAt: string;
}

export interface AnnouncementSummaryDto {
  id: string;
  title: string;
  snippet: string;
  publishedAt: string;
}

export interface AnnouncementDetailDto {
  id: string;
  title: string;
  content: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  publishedAt: string;
}
