import { z } from "zod";

export const DEFAULT_THREADS_PAGE_SIZE = 20;

export const threadsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .max(10)
    .optional()
    .transform((value) => (value ? value : undefined)),
  sort: z.enum(["newest", "active"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(DEFAULT_THREADS_PAGE_SIZE),
});

export type ThreadsQuery = z.infer<typeof threadsQuerySchema>;

export const createThreadSchema = z.object({
  title: z.string().trim().min(4).max(200),
  body: z.string().trim().min(10).max(8000),
  ticker: z
    .union([z.string().trim().toUpperCase().max(10), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value === null || value === undefined ? null : value)),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const createReplySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

/** Admin-only moderation. Either field may be sent on its own. */
export const moderateThreadSchema = z
  .object({
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .refine((value) => value.isPinned !== undefined || value.isLocked !== undefined, {
    message: "Nothing to change",
  });

export type ModerateThreadInput = z.infer<typeof moderateThreadSchema>;

export interface DiscussionAuthorDto {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface ThreadSummaryDto {
  id: string;
  title: string;
  snippet: string;
  ticker: string | null;
  author: DiscussionAuthorDto;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastActivityAt: string;
  /** True when the signed-in member wrote it, so the UI can offer delete. */
  isMine: boolean;
}

export interface ReplyDto {
  id: string;
  body: string;
  author: DiscussionAuthorDto;
  createdAt: string;
  isMine: boolean;
}

export interface ThreadDetailDto {
  id: string;
  title: string;
  body: string;
  ticker: string | null;
  author: DiscussionAuthorDto;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  isMine: boolean;
  reply: ReplyDto[];
}
