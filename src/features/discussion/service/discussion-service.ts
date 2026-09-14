import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { PaginatedResult } from "@/lib/api/pagination";
import {
  DISCUSSION_CATEGORIES,
  NEW_FOR_HOURS,
  type CategoryCountDto,
  type CommentDto,
  type ContributorDto,
  type CreateReplyInput,
  type CreateThreadInput,
  type DiscussionAuthorDto,
  type DiscussionOverviewDto,
  type DiscussionStatus,
  type ModerateReplyInput,
  type RelatedThreadDto,
  type ThreadDetailDto,
  type ThreadSummaryDto,
  type ThreadsQuery,
  type UpdateThreadInput,
} from "@/features/discussion/discussion-types";
import type {
  CommentRow,
  ContributorRow,
  DiscussionRepository,
  RelatedThreadRow,
  ThreadDetailRow,
  ThreadListRow,
} from "@/features/discussion/repository/discussion-repository";
import { discussionRepository } from "@/features/discussion/repository/discussion-repository";
import { toSlug } from "@/features/discussion/slug";

const TOP_CONTRIBUTORS = 5;
const RELATED_THREADS = 4;
const SLUG_ATTEMPTS = 20;

/** Drafts are working copy; only admins see them in any listing. */
const MEMBER_STATUSES: DiscussionStatus[] = ["PUBLISHED", "ARCHIVED"];
const ADMIN_STATUSES: DiscussionStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/**
 * Who is asking. Every read takes one, because what a member may see and what
 * an admin may see differ, and the difference has to be decided in one place
 * rather than at each call site.
 */
export interface Viewer {
  id: string;
  isAdmin: boolean;
}

export interface DiscussionService {
  listThreads(query: ThreadsQuery, viewer: Viewer): Promise<PaginatedResult<ThreadSummaryDto>>;
  getOverview(viewer: Viewer): Promise<DiscussionOverviewDto>;
  listContributors(limit: number): Promise<ContributorDto[]>;
  getThread(idOrSlug: string, viewer: Viewer, countAsView?: boolean): Promise<ThreadDetailDto>;
  createThread(viewer: Viewer, input: CreateThreadInput): Promise<ThreadDetailDto>;
  updateThread(id: string, viewer: Viewer, input: UpdateThreadInput): Promise<ThreadDetailDto>;
  deleteThread(id: string, viewer: Viewer): Promise<void>;
  comment(threadId: string, viewer: Viewer, input: CreateReplyInput): Promise<ThreadDetailDto>;
  moderateComment(replyId: string, viewer: Viewer, input: ModerateReplyInput): Promise<ThreadDetailDto>;
  deleteComment(replyId: string, viewer: Viewer): Promise<ThreadDetailDto>;
  setThreadLike(threadId: string, viewer: Viewer, liked: boolean): Promise<ThreadDetailDto>;
  setCommentLike(replyId: string, viewer: Viewer, liked: boolean): Promise<ThreadDetailDto>;
  setFollow(threadId: string, viewer: Viewer, following: boolean): Promise<ThreadDetailDto>;
}

export class DiscussionServiceImpl implements DiscussionService {
  constructor(private readonly repository: DiscussionRepository) {}

  async listThreads(
    query: ThreadsQuery,
    viewer: Viewer,
  ): Promise<PaginatedResult<ThreadSummaryDto>> {
    // The feed shows counts, not the viewer's own like state — a row is a
    // pointer to a thread, not a thing to react to — so no per-row lookup here.
    const page = await this.repository.findThreads(query, statusesFor(viewer));

    return {
      items: page.items.map(toThreadSummary),
      pagination: page.pagination,
    };
  }

  async getOverview(viewer: Viewer): Promise<DiscussionOverviewDto> {
    const [counts, contributors] = await Promise.all([
      this.repository.countByCategory(statusesFor(viewer)),
      this.repository.findTopContributors(TOP_CONTRIBUTORS),
    ]);

    const byCategory = new Map(counts.map((row) => [row.category, row.threadCount]));

    return {
      // Driven by the enum, not by what happens to be in the table, so the row
      // of cards is stable and an empty room still shows as a room.
      categories: DISCUSSION_CATEGORIES.map(
        (category): CategoryCountDto => ({
          category,
          threadCount: byCategory.get(category) ?? 0,
        }),
      ),
      contributors: contributors.map(toContributor),
    };
  }

  async listContributors(limit: number): Promise<ContributorDto[]> {
    const rows = await this.repository.findTopContributors(limit);
    return rows.map(toContributor);
  }

  async getThread(
    idOrSlug: string,
    viewer: Viewer,
    countAsView = false,
  ): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThread(idOrSlug, statusesFor(viewer));
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }

    if (countAsView) {
      // The counter is a nice-to-have; a failure here must not cost the reader
      // the thread they asked for. The figure returned is the pre-read one.
      void this.repository.incrementViewCount(thread.id).catch(() => undefined);
    }

    return this.composeDetail(thread, viewer);
  }

  async createThread(viewer: Viewer, input: CreateThreadInput): Promise<ThreadDetailDto> {
    requireAdmin(viewer);

    const slug = await this.uniqueSlug(input.title);
    const { id } = await this.repository.createThread(viewer.id, slug, input);
    return this.getThread(id, viewer);
  }

  async updateThread(
    id: string,
    viewer: Viewer,
    input: UpdateThreadInput,
  ): Promise<ThreadDetailDto> {
    requireAdmin(viewer);

    const existing = await this.repository.findThread(id, ADMIN_STATUSES);
    if (!existing) {
      throw new AppError(404, ErrorCode.notFound);
    }

    // First publication stamps the date; archiving and re-publishing keep the
    // original, because a reader cares when it was written, not when it was
    // last toggled.
    const publishedAt =
      input.status === "PUBLISHED" && existing.publishedAt === null ? new Date() : undefined;

    await this.repository.updateThread(existing.id, input, publishedAt);
    return this.getThread(existing.id, viewer);
  }

  async deleteThread(id: string, viewer: Viewer): Promise<void> {
    requireAdmin(viewer);

    const existing = await this.repository.findThread(id, ADMIN_STATUSES);
    if (!existing) {
      throw new AppError(404, ErrorCode.notFound);
    }
    await this.repository.softDeleteThread(existing.id);
  }

  async comment(
    threadId: string,
    viewer: Viewer,
    input: CreateReplyInput,
  ): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThread(threadId, statusesFor(viewer));
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }
    if (!canComment(thread)) {
      throw new AppError(403, ErrorCode.forbidden);
    }

    const parentId = await this.resolveParent(thread.id, input.parentId);
    await this.repository.createReply(thread.id, viewer.id, parentId, input);

    return this.getThread(thread.id, viewer);
  }

  async moderateComment(
    replyId: string,
    viewer: Viewer,
    input: ModerateReplyInput,
  ): Promise<ThreadDetailDto> {
    requireAdmin(viewer);

    const reply = await this.repository.findReply(replyId);
    if (!reply) {
      throw new AppError(404, ErrorCode.notFound);
    }
    await this.repository.setReplyStatus(reply.id, input.status);
    return this.getThread(reply.threadId, viewer);
  }

  async deleteComment(replyId: string, viewer: Viewer): Promise<ThreadDetailDto> {
    const reply = await this.repository.findReply(replyId);
    if (!reply) {
      throw new AppError(404, ErrorCode.notFound);
    }
    // Authors may retract their own comment; admins may remove any.
    if (!viewer.isAdmin && reply.authorId !== viewer.id) {
      throw new AppError(403, ErrorCode.forbidden);
    }

    await this.repository.softDeleteReply(reply.id);
    return this.getThread(reply.threadId, viewer);
  }

  async setThreadLike(
    threadId: string,
    viewer: Viewer,
    liked: boolean,
  ): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThread(threadId, statusesFor(viewer));
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }
    await this.repository.setThreadLike(thread.id, viewer.id, liked);
    return this.getThread(thread.id, viewer);
  }

  async setCommentLike(
    replyId: string,
    viewer: Viewer,
    liked: boolean,
  ): Promise<ThreadDetailDto> {
    const reply = await this.repository.findReply(replyId);
    if (!reply) {
      throw new AppError(404, ErrorCode.notFound);
    }
    await this.repository.setCommentLike(reply.id, viewer.id, liked);
    return this.getThread(reply.threadId, viewer);
  }

  async setFollow(
    threadId: string,
    viewer: Viewer,
    following: boolean,
  ): Promise<ThreadDetailDto> {
    const thread = await this.repository.findThread(threadId, statusesFor(viewer));
    if (!thread) {
      throw new AppError(404, ErrorCode.notFound);
    }
    await this.repository.setFollow(thread.id, viewer.id, following);
    return this.getThread(thread.id, viewer);
  }

  private async composeDetail(
    thread: ThreadDetailRow,
    viewer: Viewer,
  ): Promise<ThreadDetailDto> {
    const [comments, related, likedThreads] = await Promise.all([
      this.repository.findComments(thread.id),
      this.repository.findRelated(
        thread.id,
        thread.category,
        thread.tags,
        thread.tickers,
        RELATED_THREADS,
      ),
      this.repository.likedThreadIds(viewer.id, [thread.id]),
    ]);

    const likedComments = await this.repository.likedCommentIds(
      viewer.id,
      comments.map((row) => row.id),
    );
    const isFollowing = await this.repository.isFollowing(thread.id, viewer.id);

    return {
      ...toThreadSummaryBase(thread),
      body: thread.body,
      isLiked: likedThreads.has(thread.id),
      isFollowing,
      canComment: canComment(thread),
      comment: toCommentTree(comments, viewer, likedComments),
      related: related.map(toRelated),
      commentCount: comments.length,
    };
  }

  /*
   * One level of nesting, enforced here rather than trusted from the client.
   * A reply to a reply hangs off the same parent as the comment it answers, so
   * a finance thread never indents itself into a column two words wide.
   */
  private async resolveParent(threadId: string, parentId: string | null): Promise<string | null> {
    if (!parentId) {
      return null;
    }
    const parent = await this.repository.findReply(parentId);
    if (!parent || parent.threadId !== threadId) {
      throw new AppError(400, ErrorCode.validation, "parentId");
    }
    return parent.parentId ?? parent.id;
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = toSlug(title);
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      if (!(await this.repository.slugTaken(candidate))) {
        return candidate;
      }
    }
    // Twenty threads sharing a title is not a naming problem any more.
    return `${base}-${Date.now().toString(36)}`;
  }
}

function toContributor(row: ContributorRow): ContributorDto {
  return {
    id: row.id,
    name: row.name,
    isAdmin: row.role === "ADMIN",
    commentCount: row.commentCount,
  };
}

function requireAdmin(viewer: Viewer): void {
  if (!viewer.isAdmin) {
    throw new AppError(403, ErrorCode.forbidden);
  }
}

function statusesFor(viewer: Viewer): DiscussionStatus[] {
  return viewer.isAdmin ? ADMIN_STATUSES : MEMBER_STATUSES;
}

/** Three separate switches, one answer the UI can act on. */
function canComment(thread: { status: string; isLocked: boolean; commentsEnabled: boolean }): boolean {
  return thread.status === "PUBLISHED" && !thread.isLocked && thread.commentsEnabled;
}

function toAuthor(author: { id: string; name: string; role: string }): DiscussionAuthorDto {
  const isAdmin = author.role === "ADMIN";
  return {
    id: author.id,
    name: author.name,
    isAdmin,
    title: isAdmin ? "Founder & Analyst" : null,
  };
}

function toThreadSummaryBase(row: ThreadListRow) {
  const lastReplyAt = row.reply[0]?.createdAt ?? null;
  const publishedAt = row.publishedAt ?? row.createdAt;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    status: row.status,
    tags: row.tags,
    tickers: row.tickers,
    thumbnailUrl: row.thumbnailUrl,
    author: toAuthor(row.author),
    commentCount: row._count.reply,
    viewCount: row.viewCount,
    likeCount: row._count.reaction,
    isPinned: row.isPinned,
    isFeatured: row.isFeatured,
    isLocked: row.isLocked,
    commentsEnabled: row.commentsEnabled,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: (lastReplyAt ?? publishedAt).toISOString(),
  };
}

function toThreadSummary(row: ThreadListRow): ThreadSummaryDto {
  const publishedAt = row.publishedAt ?? row.createdAt;

  return {
    ...toThreadSummaryBase(row),
    isNew:
      row.status === "PUBLISHED" &&
      Date.now() - publishedAt.getTime() < NEW_FOR_HOURS * 60 * 60 * 1000,
  };
}

function toRelated(row: RelatedThreadRow): RelatedThreadDto {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    commentCount: row.commentCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

const HIDDEN_BODY = "This comment was removed by a moderator.";

function toComment(row: CommentRow, viewer: Viewer, liked: Set<string>): CommentDto {
  const isHidden = row.status === "HIDDEN";
  return {
    id: row.id,
    // The row survives so a reply chain keeps its middle; the text does not.
    body: isHidden && !viewer.isAdmin ? HIDDEN_BODY : row.body,
    status: row.status,
    author: toAuthor(row.author),
    createdAt: row.createdAt.toISOString(),
    likeCount: row._count.reaction,
    isLiked: liked.has(row.id),
    isMine: row.author.id === viewer.id,
    reply: [],
  };
}

function toCommentTree(rows: CommentRow[], viewer: Viewer, liked: Set<string>): CommentDto[] {
  const byId = new Map<string, CommentDto>();
  const roots: CommentDto[] = [];

  for (const row of rows) {
    byId.set(row.id, toComment(row, viewer, liked));
  }
  for (const row of rows) {
    const comment = byId.get(row.id)!;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) {
      parent.reply.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

export const discussionService: DiscussionService = new DiscussionServiceImpl(
  discussionRepository,
);
