import { db } from "@/database";
import type { PaginatedResult } from "@/lib/api/pagination";
import type {
  CreateReplyInput,
  CreateThreadInput,
  ModerateThreadInput,
  ThreadsQuery,
} from "@/features/discussion/discussion-types";

const authorSelect = { select: { id: true, name: true, role: true } } as const;

const threadListSelect = {
  id: true,
  title: true,
  body: true,
  ticker: true,
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
  ticker: true,
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

export interface DiscussionRepository {
  findThreads(query: ThreadsQuery): Promise<PaginatedResult<ThreadListRow>>;
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
    const orderBy =
      query.sort === "active"
        ? [{ isPinned: "desc" as const }, { updatedAt: "desc" as const }]
        : [{ isPinned: "desc" as const }, { createdAt: "desc" as const }];

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

  async findThreadById(id: string): Promise<ThreadDetailRow | null> {
    return db.discussionThread.findFirst({ where: { id, deletedAt: null }, select: threadDetailSelect });
  }

  async createThread(authorId: string, input: CreateThreadInput): Promise<{ id: string }> {
    return db.discussionThread.create({
      data: { authorId, title: input.title, body: input.body, ticker: input.ticker },
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
