import { db } from "@/database";
import type { UserRoleKind } from "@/database/prisma/enums";
import type { PaginatedResult } from "@/lib/api/pagination";
import type {
  CreateReplyInput,
  CreateThreadInput,
  DiscussionCategory,
  DiscussionStatus,
  ThreadsQuery,
  UpdateThreadInput,
} from "@/features/discussion/discussion-types";

const authorSelect = { select: { id: true, name: true, role: true } } as const;

const threadListSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  status: true,
  tags: true,
  tickers: true,
  thumbnailUrl: true,
  viewCount: true,
  isPinned: true,
  isFeatured: true,
  isLocked: true,
  commentsEnabled: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: authorSelect,
  _count: { select: { reply: { where: { deletedAt: null } }, reaction: true } },
  // Newest surviving comment, used as the thread's last activity.
  reply: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { createdAt: true },
  },
} as const;

export type ThreadListRow = Awaited<
  ReturnType<typeof db.discussionThread.findFirstOrThrow<{ select: typeof threadListSelect }>>
>;

const threadDetailSelect = {
  ...threadListSelect,
  body: true,
} as const;

export type ThreadDetailRow = Awaited<
  ReturnType<typeof db.discussionThread.findFirstOrThrow<{ select: typeof threadDetailSelect }>>
>;

const commentSelect = {
  id: true,
  body: true,
  status: true,
  parentId: true,
  createdAt: true,
  author: authorSelect,
  _count: { select: { reaction: true } },
} as const;

export type CommentRow = Awaited<
  ReturnType<typeof db.discussionReply.findFirstOrThrow<{ select: typeof commentSelect }>>
>;

export interface RelatedThreadRow {
  id: string;
  title: string;
  category: DiscussionCategory;
  publishedAt: Date | null;
  commentCount: number;
}

export interface CategoryCountRow {
  category: DiscussionCategory;
  threadCount: number;
}

export interface ContributorRow {
  id: string;
  name: string;
  role: UserRoleKind;
  commentCount: number;
}

export interface DiscussionRepository {
  findThreads(query: ThreadsQuery, visibleStatuses: DiscussionStatus[]): Promise<PaginatedResult<ThreadListRow>>;
  findThread(idOrSlug: string, visibleStatuses: DiscussionStatus[]): Promise<ThreadDetailRow | null>;
  findComments(threadId: string): Promise<CommentRow[]>;
  findRelated(threadId: string, category: DiscussionCategory, tags: string[], tickers: string[], limit: number): Promise<RelatedThreadRow[]>;
  countByCategory(visibleStatuses: DiscussionStatus[]): Promise<CategoryCountRow[]>;
  findTopContributors(limit: number): Promise<ContributorRow[]>;
  incrementViewCount(id: string): Promise<void>;

  createThread(authorId: string, slug: string, input: CreateThreadInput): Promise<{ id: string }>;
  updateThread(id: string, input: UpdateThreadInput, publishedAt: Date | null | undefined): Promise<void>;
  softDeleteThread(id: string): Promise<void>;
  slugTaken(slug: string): Promise<boolean>;

  createReply(threadId: string, authorId: string, parentId: string | null, input: CreateReplyInput): Promise<{ id: string }>;
  findReply(id: string): Promise<{ id: string; threadId: string; authorId: string; parentId: string | null } | null>;
  setReplyStatus(id: string, status: "VISIBLE" | "HIDDEN"): Promise<void>;
  softDeleteReply(id: string): Promise<void>;

  likedThreadIds(userId: string, threadIds: string[]): Promise<Set<string>>;
  likedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>>;
  setThreadLike(threadId: string, userId: string, liked: boolean): Promise<void>;
  setCommentLike(replyId: string, userId: string, liked: boolean): Promise<void>;
  isFollowing(threadId: string, userId: string): Promise<boolean>;
  setFollow(threadId: string, userId: string, following: boolean): Promise<void>;
}

export class PrismaDiscussionRepository implements DiscussionRepository {
  async findThreads(
    query: ThreadsQuery,
    visibleStatuses: DiscussionStatus[],
  ): Promise<PaginatedResult<ThreadListRow>> {
    const where = {
      deletedAt: null,
      status: { in: statusFilter(query.status, visibleStatuses) },
      ...(query.category ? { category: query.category } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.ticker ? { tickers: { has: query.ticker } } : {}),
      ...(query.since ? { publishedAt: { gte: new Date(`${query.since}T00:00:00.000Z`) } } : {}),
      ...(query.q
        ? {
            // Title, excerpt and body cover the prose; tags and tickers make a
            // search for "coal" or "ADRO" find the thread that is about it even
            // when the word never appears in the text.
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { excerpt: { contains: query.q, mode: "insensitive" as const } },
              { body: { contains: query.q, mode: "insensitive" as const } },
              { tags: { has: query.q } },
              { tickers: { has: query.q.toUpperCase() } },
            ],
          }
        : {}),
    };

    // Pinned threads float regardless of sort; publishedAt falls back to
    // createdAt so a draft, which has never been published, still orders.
    const pinnedFirst = { isPinned: "desc" as const };
    const orderBy = {
      latest: [pinnedFirst, { publishedAt: "desc" as const }, { createdAt: "desc" as const }],
      commented: [pinnedFirst, { reply: { _count: "desc" as const } }, { createdAt: "desc" as const }],
      viewed: [pinnedFirst, { viewCount: "desc" as const }, { createdAt: "desc" as const }],
      updated: [pinnedFirst, { updatedAt: "desc" as const }],
    }[query.sort];

    const [totalItems, items] = await Promise.all([
      db.discussionThread.count({ where }),
      db.discussionThread.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: threadListSelect,
      }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  /** Resolves either the id or the slug, so links can move to slugs later. */
  async findThread(
    idOrSlug: string,
    visibleStatuses: DiscussionStatus[],
  ): Promise<ThreadDetailRow | null> {
    return db.discussionThread.findFirst({
      where: {
        deletedAt: null,
        status: { in: visibleStatuses },
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: threadDetailSelect,
    });
  }

  async findComments(threadId: string): Promise<CommentRow[]> {
    return db.discussionReply.findMany({
      where: { threadId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: commentSelect,
    });
  }

  /*
   * Relevance, cheapest signal first: a shared ticker is the strongest link
   * between two threads, a shared tag is next, and the same category is the
   * fallback. One query with an OR rather than three, ordered by recency.
   */
  async findRelated(
    threadId: string,
    category: DiscussionCategory,
    tags: string[],
    tickers: string[],
    limit: number,
  ): Promise<RelatedThreadRow[]> {
    const rows = await db.discussionThread.findMany({
      where: {
        id: { not: threadId },
        deletedAt: null,
        status: "PUBLISHED",
        OR: [
          ...(tickers.length > 0 ? [{ tickers: { hasSome: tickers } }] : []),
          ...(tags.length > 0 ? [{ tags: { hasSome: tags } }] : []),
          { category },
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        publishedAt: true,
        _count: { select: { reply: { where: { deletedAt: null } } } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      publishedAt: row.publishedAt,
      commentCount: row._count.reply,
    }));
  }

  async countByCategory(visibleStatuses: DiscussionStatus[]): Promise<CategoryCountRow[]> {
    const grouped = await db.discussionThread.groupBy({
      by: ["category"],
      where: { deletedAt: null, status: { in: visibleStatuses } },
      _count: { _all: true },
    });
    return grouped.map((row) => ({ category: row.category, threadCount: row._count._all }));
  }

  async findTopContributors(limit: number): Promise<ContributorRow[]> {
    const grouped = await db.discussionReply.groupBy({
      by: ["authorId"],
      where: { deletedAt: null, status: "VISIBLE", thread: { deletedAt: null } },
      _count: { _all: true },
      orderBy: { _count: { authorId: "desc" } },
      take: limit,
    });
    if (grouped.length === 0) {
      return [];
    }

    const users = await db.user.findMany({
      where: { id: { in: grouped.map((row) => row.authorId) } },
      select: { id: true, name: true, role: true },
    });
    const byId = new Map(users.map((user) => [user.id, user]));

    return grouped
      .map((row) => {
        const user = byId.get(row.authorId);
        return user ? { ...user, commentCount: row._count._all } : null;
      })
      .filter((row): row is ContributorRow => row !== null);
  }

  /*
   * Raw, because updatedAt drives "recently updated" sorting and a read must
   * not touch it. Prisma's @updatedAt fires on every update() the client makes,
   * and passing `updatedAt: undefined` does not opt out — measured: opening an
   * old thread floated it above genuinely active ones.
   */
  async incrementViewCount(id: string): Promise<void> {
    await db.$executeRaw`
      UPDATE t_discussion_thread SET view_count = view_count + 1 WHERE id = ${id}`;
  }

  async createThread(
    authorId: string,
    slug: string,
    input: CreateThreadInput,
  ): Promise<{ id: string }> {
    return db.discussionThread.create({
      data: {
        authorId,
        slug,
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        category: input.category,
        status: input.status,
        tags: input.tags,
        tickers: input.tickers,
        thumbnailUrl: input.thumbnailUrl,
        isPinned: input.isPinned,
        isFeatured: input.isFeatured,
        commentsEnabled: input.commentsEnabled,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true },
    });
  }

  async updateThread(
    id: string,
    input: UpdateThreadInput,
    publishedAt: Date | null | undefined,
  ): Promise<void> {
    await db.discussionThread.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.excerpt === undefined ? {} : { excerpt: input.excerpt }),
        ...(input.body === undefined ? {} : { body: input.body }),
        ...(input.category === undefined ? {} : { category: input.category }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.tags === undefined ? {} : { tags: input.tags }),
        ...(input.tickers === undefined ? {} : { tickers: input.tickers }),
        ...(input.thumbnailUrl === undefined ? {} : { thumbnailUrl: input.thumbnailUrl }),
        ...(input.isPinned === undefined ? {} : { isPinned: input.isPinned }),
        ...(input.isFeatured === undefined ? {} : { isFeatured: input.isFeatured }),
        ...(input.isLocked === undefined ? {} : { isLocked: input.isLocked }),
        ...(input.commentsEnabled === undefined ? {} : { commentsEnabled: input.commentsEnabled }),
        ...(publishedAt === undefined ? {} : { publishedAt }),
      },
    });
  }

  async softDeleteThread(id: string): Promise<void> {
    await db.discussionThread.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async slugTaken(slug: string): Promise<boolean> {
    return (await db.discussionThread.count({ where: { slug } })) > 0;
  }

  async createReply(
    threadId: string,
    authorId: string,
    parentId: string | null,
    input: CreateReplyInput,
  ): Promise<{ id: string }> {
    // Touching the thread keeps "recently updated" honest without a
    // denormalised column.
    const [reply] = await db.$transaction([
      db.discussionReply.create({
        data: { threadId, authorId, parentId, body: input.body },
        select: { id: true },
      }),
      db.discussionThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
    ]);
    return reply;
  }

  async findReply(
    id: string,
  ): Promise<{ id: string; threadId: string; authorId: string; parentId: string | null } | null> {
    return db.discussionReply.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, threadId: true, authorId: true, parentId: true },
    });
  }

  async setReplyStatus(id: string, status: "VISIBLE" | "HIDDEN"): Promise<void> {
    await db.discussionReply.update({ where: { id }, data: { status } });
  }

  async softDeleteReply(id: string): Promise<void> {
    await db.discussionReply.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async likedThreadIds(userId: string, threadIds: string[]): Promise<Set<string>> {
    if (threadIds.length === 0) {
      return new Set();
    }
    const rows = await db.discussionReaction.findMany({
      where: { userId, threadId: { in: threadIds } },
      select: { threadId: true },
    });
    return new Set(rows.map((row) => row.threadId));
  }

  async likedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>> {
    if (commentIds.length === 0) {
      return new Set();
    }
    const rows = await db.commentReaction.findMany({
      where: { userId, replyId: { in: commentIds } },
      select: { replyId: true },
    });
    return new Set(rows.map((row) => row.replyId));
  }

  /* The unique key is what makes a like idempotent: double-clicking the button
     cannot run the count up, and un-liking twice is not an error. */
  async setThreadLike(threadId: string, userId: string, liked: boolean): Promise<void> {
    if (liked) {
      await db.discussionReaction.upsert({
        where: { userId_threadId_type: { userId, threadId, type: "LIKE" } },
        update: {},
        create: { userId, threadId, type: "LIKE" },
      });
      return;
    }
    await db.discussionReaction.deleteMany({ where: { userId, threadId, type: "LIKE" } });
  }

  async setCommentLike(replyId: string, userId: string, liked: boolean): Promise<void> {
    if (liked) {
      await db.commentReaction.upsert({
        where: { userId_replyId_type: { userId, replyId, type: "LIKE" } },
        update: {},
        create: { userId, replyId, type: "LIKE" },
      });
      return;
    }
    await db.commentReaction.deleteMany({ where: { userId, replyId, type: "LIKE" } });
  }

  async isFollowing(threadId: string, userId: string): Promise<boolean> {
    return (await db.discussionFollow.count({ where: { threadId, userId } })) > 0;
  }

  async setFollow(threadId: string, userId: string, following: boolean): Promise<void> {
    if (following) {
      await db.discussionFollow.upsert({
        where: { userId_threadId: { userId, threadId } },
        update: {},
        create: { userId, threadId },
      });
      return;
    }
    await db.discussionFollow.deleteMany({ where: { userId, threadId } });
  }
}

/** Drafts are admin-only; everyone else sees published and archived threads. */
function statusFilter(
  requested: DiscussionStatus | undefined,
  visible: DiscussionStatus[],
): DiscussionStatus[] {
  if (!requested) {
    return visible;
  }
  return visible.includes(requested) ? [requested] : visible;
}

export const discussionRepository: DiscussionRepository = new PrismaDiscussionRepository();
