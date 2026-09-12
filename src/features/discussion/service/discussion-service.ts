import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { truncate } from "@/lib/text/truncate";
import type { PaginatedResult } from "@/lib/api/pagination";
import {
  DISCUSSION_CATEGORIES,
  type CreateReplyInput,
  type CreateThreadInput,
  type DiscussionAuthorDto,
  type DiscussionOverviewDto,
  type ModerateThreadInput,
  type ReplyDto,
  type ThreadDetailDto,
  type ThreadSummaryDto,
  type ThreadsQuery,
} from "@/features/discussion/discussion-types";
import type {
  DiscussionRepository,
  ThreadDetailRow,
  ThreadListRow,
} from "@/features/discussion/repository/discussion-repository";
import { discussionRepository } from "@/features/discussion/repository/discussion-repository";

const SNIPPET_MAX_LENGTH = 180;
const TOP_CONTRIBUTORS = 5;

export interface DiscussionService {
  listThreads(query: ThreadsQuery, userId: string): Promise<PaginatedResult<ThreadSummaryDto>>;
  getOverview(): Promise<DiscussionOverviewDto>;
  getThread(id: string, userId: string, countAsView?: boolean): Promise<ThreadDetailDto>;
  createThread(authorId: string, input: CreateThreadInput): Promise<ThreadDetailDto>;
  reply(threadId: string, authorId: string, input: CreateReplyInput): Promise<ThreadDetailDto>;
  moderate(id: string, input: ModerateThreadInput): Promise<ThreadDetailDto>;
  deleteThread(id: string, userId: string, isAdmin: boolean): Promise<void>;
}

export class DiscussionServiceImpl implements DiscussionService {
  constructor(private readonly repository: DiscussionRepository) {}

  async listThreads(
    query: ThreadsQuery,
    userId: string,
  ): Promise<PaginatedResult<ThreadSummaryDto>> {
    const page = await this.repository.findThreads(query);
    return {
      items: page.items.map((row) => toThreadSummary(row, userId)),
      pagination: page.pagination,
    };
  }

  async getOverview(): Promise<DiscussionOverviewDto> {
    const [counts, contributors] = await Promise.all([
      this.repository.countByCategory(),
      this.repository.findTopContributors(TOP_CONTRIBUTORS),
    ]);

    const byCategory = new Map(counts.map((row) => [row.category, row.threadCount]));

    return {
      // Driven by the enum, not by what happens to be in the table, so the row
      // of cards is stable and an empty room still shows as a room.
      categories: DISCUSSION_CATEGORIES.map((category) => ({
        category,
        threadCount: byCategory.get(category) ?? 0,
      })),
      contributors: contributors.map((row) => ({
        id: row.id,
        name: row.name,
        isAdmin: row.role === "ADMIN",
        replyCount: row.replyCount,
      })),
    };
  }

  async getThread(id: string, userId: string, countAsView = false): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThreadById(id);
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }

    if (countAsView) {
      // The counter is a nice-to-have; a failure here must not cost the reader
      // the thread they asked for. The returned figure is the pre-read one.
      void this.repository.incrementViewCount(id).catch(() => undefined);
    }

    return toThreadDetail(thread, userId);
  }

  async createThread(authorId: string, input: CreateThreadInput): Promise<ThreadDetailDto> {
    const { id } = await this.repository.createThread(authorId, input);
    return this.getThread(id, authorId);
  }

  async reply(
    threadId: string,
    authorId: string,
    input: CreateReplyInput,
  ): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThreadOwner(threadId);
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }
    // A locked thread still reads, it just stops taking new replies.
    if (thread.isLocked) {
      throw new AppError(403, ErrorCode.forbidden);
    }

    await this.repository.createReply(threadId, authorId, input);
    return this.getThread(threadId, authorId);
  }

  async moderate(id: string, input: ModerateThreadInput): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThreadOwner(id);
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }

    await this.repository.moderateThread(id, input);
    return this.getThread(id, thread.authorId);
  }

  async deleteThread(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const thread = await this.repository.findThreadOwner(id);
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }
    // Authors can retract their own thread; admins can remove any.
    if (!isAdmin && thread.authorId !== userId) {
      throw new AppError(403, ErrorCode.forbidden);
    }

    await this.repository.softDeleteThread(id);
  }
}

function toAuthor(author: { id: string; name: string; role: string }): DiscussionAuthorDto {
  return { id: author.id, name: author.name, isAdmin: author.role === "ADMIN" };
}

function toThreadSummary(row: ThreadListRow, userId: string): ThreadSummaryDto {
  return {
    id: row.id,
    title: row.title,
    snippet: truncate(row.body, SNIPPET_MAX_LENGTH),
    category: row.category,
    ticker: row.ticker,
    viewCount: row.viewCount,
    author: toAuthor(row.author),
    replyCount: row._count.reply,
    isPinned: row.isPinned,
    isLocked: row.isLocked,
    createdAt: row.createdAt.toISOString(),
    // Falls back to the opening post when nobody has replied yet.
    lastActivityAt: (row.reply[0]?.createdAt ?? row.createdAt).toISOString(),
    isMine: row.author.id === userId,
  };
}

function toReply(
  reply: ThreadDetailRow["reply"][number],
  userId: string,
): ReplyDto {
  return {
    id: reply.id,
    body: reply.body,
    author: toAuthor(reply.author),
    createdAt: reply.createdAt.toISOString(),
    isMine: reply.author.id === userId,
  };
}

function toThreadDetail(thread: ThreadDetailRow, userId: string): ThreadDetailDto {
  return {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    category: thread.category,
    ticker: thread.ticker,
    viewCount: thread.viewCount,
    author: toAuthor(thread.author),
    isPinned: thread.isPinned,
    isLocked: thread.isLocked,
    createdAt: thread.createdAt.toISOString(),
    isMine: thread.author.id === userId,
    reply: thread.reply.map((reply) => toReply(reply, userId)),
  };
}

export const discussionService: DiscussionService = new DiscussionServiceImpl(discussionRepository);
