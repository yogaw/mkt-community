import { z } from "zod";
import {
  CommentStatusKind,
  DiscussionCategoryKind,
  DiscussionStatusKind,
} from "@/database/prisma/enums";

export const DEFAULT_THREADS_PAGE_SIZE = 10;
export const MAX_TAGS = 8;
export const MAX_TICKERS = 8;
/** One level of nesting. Anything deeper is flattened onto its grandparent. */
export const MAX_REPLY_DEPTH = 1;
/** How long a published thread carries the "New" badge. */
export const NEW_FOR_HOURS = 72;

/**
 * The five rooms the board is divided into. The order is the order they are
 * shown in; it runs from the broadest question to the most personal one.
 *
 * These stay an enum rather than becoming a table: a category has a name and an
 * icon and nothing else, no independent lifecycle, and the set is fixed by
 * editorial policy rather than by data.
 */
export const DISCUSSION_CATEGORIES = [
  DiscussionCategoryKind.MARKET_OUTLOOK,
  DiscussionCategoryKind.STOCK_DISCUSSION,
  DiscussionCategoryKind.MACRO_ECONOMY,
  DiscussionCategoryKind.SECTOR_ANALYSIS,
  DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
] as const;

export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];
export type DiscussionStatus = keyof typeof DiscussionStatusKind;
export type CommentStatus = keyof typeof CommentStatusKind;

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

export const THREAD_SORTS = ["latest", "commented", "viewed", "updated"] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];

export const SORT_LABEL: Record<ThreadSort, string> = {
  latest: "Latest",
  commented: "Most Commented",
  viewed: "Most Viewed",
  updated: "Recently Updated",
};

/* ----------------------------------------------------------------- input -- */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const threadsQuerySchema = z.object({
  q: optionalText(100),
  category: z.enum(DISCUSSION_CATEGORIES).optional(),
  tag: optionalText(40),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .max(10)
    .optional()
    .transform((value) => (value ? value : undefined)),
  /** ISO date; threads published on or after it. */
  since: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sort: z.enum(THREAD_SORTS).default("latest"),
  /** Admins only; the service refuses it for anyone else. */
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(DEFAULT_THREADS_PAGE_SIZE),
});

export type ThreadsQuery = z.infer<typeof threadsQuerySchema>;

const tickers = z.array(z.string().trim().toUpperCase().min(1).max(10)).max(MAX_TICKERS);
const tags = z.array(z.string().trim().min(1).max(40)).max(MAX_TAGS);

/** Absent means "leave alone" on a patch, so undefined must survive. */
const optionalList = <T extends z.ZodType<string[]>>(schema: T) =>
  schema.optional().transform((value) => (value === undefined ? undefined : dedupe(value)));

/** Absent means "none" on a create, so undefined collapses to an empty list. */
const defaultedList = <T extends z.ZodType<string[]>>(schema: T) =>
  schema.optional().transform((value) => dedupe(value ?? []));

export const createThreadSchema = z.object({
  title: z.string().trim().min(4).max(200),
  excerpt: z.string().trim().min(10).max(400),
  body: z.string().trim().min(10).max(20000),
  category: z.enum(DISCUSSION_CATEGORIES),
  tags: defaultedList(tags),
  tickers: defaultedList(tickers),
  thumbnailUrl: z
    .union([z.string().trim().max(500), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  isPinned: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  commentsEnabled: z.boolean().default(true),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

/** Edit and moderation share one endpoint; every field is optional. */
export const updateThreadSchema = z
  .object({
    title: z.string().trim().min(4).max(200).optional(),
    excerpt: z.string().trim().min(10).max(400).optional(),
    body: z.string().trim().min(10).max(20000).optional(),
    category: z.enum(DISCUSSION_CATEGORIES).optional(),
    tags: optionalList(tags),
    tickers: optionalList(tickers),
    thumbnailUrl: z
      .union([z.string().trim().max(500), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value === undefined ? undefined : value || null)),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    isPinned: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    commentsEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Nothing to change",
  });

export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;

export const createReplySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  /** Null for a top-level comment. */
  parentId: z
    .union([z.string().trim().max(30), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

export const moderateReplySchema = z.object({
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

export type ModerateReplyInput = z.infer<typeof moderateReplySchema>;

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/* ------------------------------------------------------------------ dtos -- */

export interface DiscussionAuthorDto {
  id: string;
  name: string;
  isAdmin: boolean;
  /** Shown beside an admin name so a desk answer is identifiable at a glance. */
  title: string | null;
}

export interface ThreadSummaryDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: DiscussionCategory;
  status: DiscussionStatus;
  tags: string[];
  tickers: string[];
  thumbnailUrl: string | null;
  author: DiscussionAuthorDto;
  commentCount: number;
  /** Opens, not unique readers. Approximate by design. */
  viewCount: number;
  likeCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  isLocked: boolean;
  commentsEnabled: boolean;
  publishedAt: string | null;
  createdAt: string;
  lastActivityAt: string;
  /*
   * Recency, not per-user read state. Nothing tracks what a member has opened,
   * and inventing a read-receipt table for a badge would be the wrong trade —
   * so this says "published recently", and the badge says "New".
   */
  isNew: boolean;
}

export interface CommentDto {
  id: string;
  body: string;
  status: CommentStatus;
  author: DiscussionAuthorDto;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  isMine: boolean;
  /** At most one level; deeper replies are flattened onto this list. */
  reply: CommentDto[];
}

export interface RelatedThreadDto {
  id: string;
  title: string;
  category: DiscussionCategory;
  commentCount: number;
  publishedAt: string | null;
}

export interface ThreadDetailDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: DiscussionCategory;
  status: DiscussionStatus;
  tags: string[];
  tickers: string[];
  thumbnailUrl: string | null;
  author: DiscussionAuthorDto;
  commentCount: number;
  viewCount: number;
  likeCount: number;
  isLiked: boolean;
  isFollowing: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  isLocked: boolean;
  commentsEnabled: boolean;
  /** Locked, archived or comments switched off — the UI needs one answer. */
  canComment: boolean;
  publishedAt: string | null;
  createdAt: string;
  comment: CommentDto[];
  related: RelatedThreadDto[];
}

export interface CategoryCountDto {
  category: DiscussionCategory;
  threadCount: number;
}

export interface ContributorDto {
  id: string;
  name: string;
  isAdmin: boolean;
  /** Comments written. The board measures participation, not thread starts. */
  commentCount: number;
}

/** Everything the board needs beside the thread list itself. */
export interface DiscussionOverviewDto {
  categories: CategoryCountDto[];
  contributors: ContributorDto[];
}
