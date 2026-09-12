import { db } from "@/database";
import type { UserRoleKind } from "@/database/prisma/enums";
import type { PaginatedResult } from "@/lib/api/pagination";
import type {
  CreateReplyInput,
  CreateThreadInput,
  DiscussionCategory,
  ModerateThreadInput,
  ThreadsQuery,
} from "@/features/discussion/discussion-types";

const authorSelect = { select: { id: true, name: true, role: true } } as const;

const threadListSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  ticker: true,
  viewCount: true,
  isPinned: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  author: authorSelect,
  _count: { select: { reply: { where: { deletedAt: null } } } },
  // Newest surviving reply, used as the thread's last activity.
  reply: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { createdAt: true },
  },
} as const;

export type ThreadListRow = Awaited<ReturnType<typeof db.discussionThread.findFirstOrThrow<{
  select: typeof threadListSelect;
}>>>;

const threadDetailSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  ticker: true,
  viewCount: true,
  isPinned: true,
  isLocked: true,
  createdAt: true,
  author: authorSelect,
  reply: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    select: { id: true, body: true, createdAt: true, author: authorSelect },
  },
} as const;

export type ThreadDetailRow = Awaited<ReturnType<typeof db.discussionThread.findFirstOrThrow<{
  select: typeof threadDetailSelect;
}>>>;

export interface CategoryCountRow {
  category: DiscussionCategory;
  threadCount: number;
}

export interface ContributorRow {
  id: string;
  name: string;
  role: UserRoleKind;
  replyCount: number;
}

export interface DiscussionRepository {
  findThreads(query: ThreadsQuery): Promise<PaginatedResult<ThreadListRow>>;
  countByCategory(): Promise<CategoryCountRow[]>;
  findTopContributors(limit: number): Promise<ContributorRow[]>;
  incrementViewCount(id: string): Promise<void>;
  findThreadById(id: string): Promise<ThreadDetailRow | null>;
  createThread(authorId: string, input: CreateThreadInput): Promise<{ id: string }>;
  createReply(threadId: string, authorId: string, input: CreateReplyInput): Promise<void>;
  moderateThread(id: string, input: ModerateThreadInput): Promise<void>;
  softDeleteThread(id: string): Promise<void>;
  findThreadOwner(id: string): Promise<{ authorId: string; isLocked: boolean } | null>;
}

export class PrismaDiscussionRepository implements DiscussionRepository {
  async findThreads(query: ThreadsQuery): Promise<PaginatedResult<ThreadListRow>> {
    const where = {
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.ticker ? { ticker: query.ticker } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { body: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    // Pinned threads float regardless of sort; updatedAt moves when a reply lands.
    const pinnedFirst = { isPinned: "desc" as const };
    const orderBy = {
      active: [pinnedFirst, { updatedAt: "desc" as const }],
      newest: [pinnedFirst, { createdAt: "desc" as const }],
      discussed: [pinnedFirst, { reply: { _count: "desc" as const } }, { createdAt: "desc" as const }],
      viewed: [pinnedFirst, { viewCount: "desc" as const }, { createdAt: "desc" as const }],
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

  /*
   * Counts every category, including the ones with nothing in them: the cards
   * are a map of the board, and a room that exists but is empty is a more
   * useful thing to show than a gap in the row.
   */
  async countByCategory(): Promise<CategoryCountRow[]> {
    const grouped = await db.discussionThread.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    return grouped.map((row) => ({ category: row.category, threadCount: row._count._all }));
  }

  /*
   * Ranked by replies written, not threads started. Someone who answers other
   * people's questions is carrying the board; someone who only posts their own
   * is not, and a thread count would rank them the same.
   */
  async findTopContributors(limit: number): Promise<ContributorRow[]> {
    const grouped = await db.discussionReply.groupBy({
      by: ["authorId"],
      where: { deletedAt: null, thread: { deletedAt: null } },
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
        return user ? { ...user, replyCount: row._count._all } : null;
      })
      .filter((row): row is ContributorRow => row !== null);
  }

  /*
   * Raw, because updatedAt drives "recently active" sorting and a read must
   * not touch it. Prisma's @updatedAt fires on every update() the client
   * makes, and passing `updatedAt: undefined` does not opt out — measured:
   * opening a thread floated it above genuinely active ones. SQL is the only
   * way to move one column and leave the other alone.
   */
  async incrementViewCount(id: string): Promise<void> {
    await db.$executeRaw`
      UPDATE t_discussion_thread SET view_count = view_count + 1 WHERE id = ${id}`;
  }

  async findThreadById(id: string): Promise<ThreadDetailRow | null> {
    return db.discussionThread.findFirst({ where: { id, deletedAt: null }, select: threadDetailSelect });
  }

  async createThread(authorId: string, input: CreateThreadInput): Promise<{ id: string }> {
    return db.discussionThread.create({
      data: {
        authorId,
        title: input.title,
        body: input.body,
        category: input.category,
        ticker: input.ticker,
      },
      select: { id: true },
    });
  }

  async createReply(threadId: string, authorId: string, input: CreateReplyInput): Promise<void> {
    // Touching the thread keeps "active" sorting honest without a denormalised column.
    await db.$transaction([
      db.discussionReply.create({ data: { threadId, authorId, body: input.body } }),
      db.discussionThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
    ]);
  }

  async moderateThread(id: string, input: ModerateThreadInput): Promise<void> {
    await db.discussionThread.update({
      where: { id },
      data: {
        ...(input.isPinned === undefined ? {} : { isPinned: input.isPinned }),
        ...(input.isLocked === undefined ? {} : { isLocked: input.isLocked }),
      },
    });
  }

  async softDeleteThread(id: string): Promise<void> {
    await db.discussionThread.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findThreadOwner(id: string): Promise<{ authorId: string; isLocked: boolean } | null> {
    return db.discussionThread.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, isLocked: true },
    });
  }
}

export const discussionRepository: DiscussionRepository = new PrismaDiscussionRepository();
