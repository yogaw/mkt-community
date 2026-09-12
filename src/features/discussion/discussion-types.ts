import { z } from "zod";
import { DiscussionCategoryKind } from "@/database/prisma/enums";

export const DEFAULT_THREADS_PAGE_SIZE = 20;

/**
 * The five rooms the board is divided into. The order is the order they are
 * shown in; it runs from the broadest question to the most personal one.
 */
export const DISCUSSION_CATEGORIES = [
  DiscussionCategoryKind.MARKET_OUTLOOK,
  DiscussionCategoryKind.STOCK_DISCUSSION,
  DiscussionCategoryKind.MACRO_ECONOMY,
  DiscussionCategoryKind.SECTOR_ANALYSIS,
  DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
] as const;

export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<DiscussionCategory, string> = {
  MARKET_OUTLOOK: "Market Outlook",
  STOCK_DISCUSSION: "Stock Discussion",
  MACRO_ECONOMY: "Macro Economy",
  SECTOR_ANALYSIS: "Sector Analysis",
  STRATEGY_PSYCHOLOGY: "Strategy & Psychology",
};

export const CATEGORY_BLURB: Record<DiscussionCategory, string> = {
  MARKET_OUTLOOK: "Where the index goes from here",
  STOCK_DISCUSSION: "Single names, fundamentals and price",
  MACRO_ECONOMY: "Rates, the rupiah and the data behind them",
  SECTOR_ANALYSIS: "Banks, energy, consumer, and what drives them",
  STRATEGY_PSYCHOLOGY: "Sizing, risk and staying honest with yourself",
};

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
  category: z.enum(DISCUSSION_CATEGORIES).optional(),
  sort: z.enum(["newest", "active", "discussed", "viewed"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(DEFAULT_THREADS_PAGE_SIZE),
});

export type ThreadsQuery = z.infer<typeof threadsQuerySchema>;

export const createThreadSchema = z.object({
  title: z.string().trim().min(4).max(200),
  body: z.string().trim().min(10).max(8000),
  category: z.enum(DISCUSSION_CATEGORIES).default(DiscussionCategoryKind.MARKET_OUTLOOK),
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
  category: DiscussionCategory;
  ticker: string | null;
  /** Opens, not unique readers. Approximate by design; nothing depends on it. */
  viewCount: number;
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
  category: DiscussionCategory;
  ticker: string | null;
  viewCount: number;
  author: DiscussionAuthorDto;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  isMine: boolean;
  reply: ReplyDto[];
}

export interface CategoryCountDto {
  category: DiscussionCategory;
  threadCount: number;
}

export interface ContributorDto {
  id: string;
  name: string;
  isAdmin: boolean;
  /** Replies written. The board measures participation, not thread starts. */
  replyCount: number;
}

/** Everything the board needs beside the thread list itself. */
export interface DiscussionOverviewDto {
  categories: CategoryCountDto[];
  contributors: ContributorDto[];
}
