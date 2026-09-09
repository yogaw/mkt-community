import { z } from "zod";

export type SearchResultKind = "video" | "news" | "announcement";

export const DEFAULT_SEARCH_PAGE_SIZE = 20;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
});

export interface SearchResultItemDto {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string | null;
  publishedAt: string;
}
