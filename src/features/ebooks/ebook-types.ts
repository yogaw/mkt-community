import { z } from "zod";

export const EBOOK_TAGS = ["RESEARCH_REPORT", "ARTICLE"] as const;
export type EbookTag = (typeof EBOOK_TAGS)[number];

export const DEFAULT_EBOOKS_PAGE_SIZE = 24;

export const ebooksQuerySchema = z.object({
  tag: z.enum(EBOOK_TAGS).optional(),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(DEFAULT_EBOOKS_PAGE_SIZE),
});

export type EbooksQuery = z.infer<typeof ebooksQuerySchema>;

export const createEbookSchema = z.object({
  title: z.string().trim().min(4).max(300),
  tag: z.enum(EBOOK_TAGS),
  source: z.string().trim().min(2).max(150),
  author: z.string().trim().max(200).optional().transform((value) => value || null),
  summary: z.string().trim().max(4000).optional().transform((value) => value || null),
  tickers: z.array(z.string().trim().toUpperCase().max(10)).max(20).default([]),
  publishedAt: z.coerce.date(),
});

export type CreateEbookInput = z.infer<typeof createEbookSchema>;

export interface EbookDto {
  id: string;
  title: string;
  tag: EbookTag;
  summary: string | null;
  source: string;
  author: string | null;
  tickers: string[];
  publishedAt: string;
  fileSizeBytes: number;
  /** Authenticated download path; there is no public URL for the file. */
  downloadPath: string;
}
