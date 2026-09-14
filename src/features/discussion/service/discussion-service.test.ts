import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DiscussionServiceImpl, type Viewer } from "./discussion-service";
import { DISCUSSION_CATEGORIES } from "../discussion-types";
import type { DiscussionRepository } from "../repository/discussion-repository";

const ADMIN: Viewer = { id: "admin-1", isAdmin: true };
const MEMBER: Viewer = { id: "member-1", isAdmin: false };

function threadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    slug: "a-thread",
    title: "A thread",
    excerpt: "An excerpt",
    body: "Body",
    category: "MARKET_OUTLOOK",
    status: "PUBLISHED",
    tags: [],
    tickers: [],
    thumbnailUrl: null,
    viewCount: 5,
    isPinned: false,
    isFeatured: false,
    isLocked: false,
    commentsEnabled: true,
    publishedAt: new Date("2026-09-01"),
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-01"),
    author: { id: "admin-1", name: "Admin", role: "ADMIN" },
    _count: { reply: 0, reaction: 0 },
    reply: [],
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<DiscussionRepository> = {}): DiscussionRepository {
  const base = {
    findThreads: async () => ({
      items: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
    }),
    findThread: async () => threadRow(),
    findComments: async () => [],
    findRelated: async () => [],
    countByCategory: async () => [],
    findTopContributors: async () => [],
    incrementViewCount: async () => undefined,
    createThread: async () => ({ id: "t1" }),
    updateThread: async () => undefined,
    softDeleteThread: async () => undefined,
    slugTaken: async () => false,
    createReply: async () => ({ id: "c1" }),
    findReply: async () => null,
    setReplyStatus: async () => undefined,
    softDeleteReply: async () => undefined,
    likedThreadIds: async () => new Set<string>(),
    likedCommentIds: async () => new Set<string>(),
    setThreadLike: async () => undefined,
    setCommentLike: async () => undefined,
    isFollowing: async () => false,
    setFollow: async () => undefined,
  };
  return { ...base, ...overrides } as unknown as DiscussionRepository;
}

async function rejects(run: () => Promise<unknown>, status: number): Promise<void> {
  await assert.rejects(run, (error: { status?: number }) => error.status === status);
}

describe("only admins start discussions", () => {
  it("refuses a member creating one", async () => {
    let created = false;
    const service = new DiscussionServiceImpl(
      fakeRepository({
        createThread: async () => {
          created = true;
          return { id: "t1" };
        },
      }),
    );

    await rejects(
      () =>
        service.createThread(MEMBER, {
          title: "Mine",
          excerpt: "An excerpt here",
          body: "A body here",
          category: "MARKET_OUTLOOK",
          tags: [],
          tickers: [],
          thumbnailUrl: null,
          status: "PUBLISHED",
          isPinned: false,
          isFeatured: false,
          commentsEnabled: true,
        }),
      403,
    );
    // The check must happen before the write, not after it.
    assert.equal(created, false);
  });

  it("refuses a member editing, deleting or moderating", async () => {
    const service = new DiscussionServiceImpl(
      fakeRepository({ findReply: async () => ({ id: "c1", threadId: "t1", authorId: "someone", parentId: null }) }),
    );

    await rejects(() => service.updateThread("t1", MEMBER, { isPinned: true } as never), 403);
    await rejects(() => service.deleteThread("t1", MEMBER), 403);
    await rejects(() => service.moderateComment("c1", MEMBER, { status: "HIDDEN" }), 403);
  });

  it("lets a member comment", async () => {
    let posted = false;
    const service = new DiscussionServiceImpl(
      fakeRepository({
        createReply: async () => {
          posted = true;
          return { id: "c1" };
        },
      }),
    );

    await service.comment("t1", MEMBER, { body: "My view", parentId: null });
    assert.equal(posted, true);
  });
});

describe("drafts are admin-only", () => {
  it("asks the repository for a narrower set of statuses for a member", async () => {
    const seen: string[][] = [];
    const service = new DiscussionServiceImpl(
      fakeRepository({
        findThreads: async (_query, statuses) => {
          seen.push([...statuses]);
          return { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } };
        },
      }),
    );

    const query = { sort: "latest", page: 1, pageSize: 10 } as never;
    await service.listThreads(query, MEMBER);
    await service.listThreads(query, ADMIN);

    assert.deepEqual(seen[0], ["PUBLISHED", "ARCHIVED"]);
    assert.deepEqual(seen[1], ["DRAFT", "PUBLISHED", "ARCHIVED"]);
  });
});

describe("commenting is closed for a reason", () => {
  const cases = [
    { label: "archived", overrides: { status: "ARCHIVED" } },
    { label: "locked", overrides: { isLocked: true } },
    { label: "comments off", overrides: { commentsEnabled: false } },
    { label: "draft", overrides: { status: "DRAFT" } },
  ];

  for (const { label, overrides } of cases) {
    it(`refuses a comment when the thread is ${label}`, async () => {
      const service = new DiscussionServiceImpl(
        fakeRepository({ findThread: async () => threadRow(overrides) as never }),
      );
      await rejects(() => service.comment("t1", MEMBER, { body: "hi", parentId: null }), 403);
    });
  }

  it("reports canComment so the UI does not have to re-derive it", async () => {
    const open = new DiscussionServiceImpl(fakeRepository());
    const locked = new DiscussionServiceImpl(
      fakeRepository({ findThread: async () => threadRow({ isLocked: true }) as never }),
    );

    assert.equal((await open.getThread("t1", MEMBER)).canComment, true);
    assert.equal((await locked.getThread("t1", MEMBER)).canComment, false);
  });
});

describe("replies nest one level", () => {
  it("hangs a reply to a reply off the same parent", async () => {
    const parents: Array<string | null> = [];
    const service = new DiscussionServiceImpl(
      fakeRepository({
        // c2 is already a reply to c1.
        findReply: async (id) =>
          id === "c2"
            ? { id: "c2", threadId: "t1", authorId: "x", parentId: "c1" }
            : { id: "c1", threadId: "t1", authorId: "x", parentId: null },
        createReply: async (_threadId, _authorId, parentId) => {
          parents.push(parentId);
          return { id: "new" };
        },
      }),
    );

    await service.comment("t1", MEMBER, { body: "answering the reply", parentId: "c2" });
    await service.comment("t1", MEMBER, { body: "answering the comment", parentId: "c1" });
    await service.comment("t1", MEMBER, { body: "top level", parentId: null });

    // Never "c2": a third level would indent the thread into a narrow column.
    assert.deepEqual(parents, ["c1", "c1", null]);
  });

  it("refuses a parent from another thread", async () => {
    const service = new DiscussionServiceImpl(
      fakeRepository({
        findReply: async () => ({ id: "c9", threadId: "other", authorId: "x", parentId: null }),
      }),
    );
    await rejects(() => service.comment("t1", MEMBER, { body: "hi", parentId: "c9" }), 400);
  });
});

describe("comment deletion", () => {
  it("lets an author retract their own and refuses someone else's", async () => {
    const mine = new DiscussionServiceImpl(
      fakeRepository({
        findReply: async () => ({ id: "c1", threadId: "t1", authorId: MEMBER.id, parentId: null }),
      }),
    );
    const theirs = new DiscussionServiceImpl(
      fakeRepository({
        findReply: async () => ({ id: "c1", threadId: "t1", authorId: "someone-else", parentId: null }),
      }),
    );

    await mine.deleteComment("c1", MEMBER);
    await rejects(() => theirs.deleteComment("c1", MEMBER), 403);
    // An admin may remove any.
    await theirs.deleteComment("c1", ADMIN);
  });
});

describe("hidden comments", () => {
  const hiddenRow = {
    id: "c1",
    body: "the original text",
    status: "HIDDEN",
    parentId: null,
    createdAt: new Date("2026-09-02"),
    author: { id: "u2", name: "Someone", role: "MEMBER" },
    _count: { reaction: 0 },
  };

  it("withholds the text from members but keeps the row", async () => {
    const service = new DiscussionServiceImpl(
      fakeRepository({ findComments: async () => [hiddenRow] as never }),
    );

    const forMember = await service.getThread("t1", MEMBER);
    assert.equal(forMember.comment.length, 1, "the row survives so a reply chain keeps its middle");
    assert.equal(forMember.comment[0].body.includes("original text"), false);

    const forAdmin = await service.getThread("t1", ADMIN);
    assert.equal(forAdmin.comment[0].body, "the original text");
  });
});

describe("publish stamps", () => {
  it("sets publishedAt on first publish and keeps it afterwards", async () => {
    const stamps: Array<Date | null | undefined> = [];
    const neverPublished = new DiscussionServiceImpl(
      fakeRepository({
        findThread: async () => threadRow({ status: "DRAFT", publishedAt: null }) as never,
        updateThread: async (_id, _input, publishedAt) => {
          stamps.push(publishedAt);
        },
      }),
    );
    const alreadyPublished = new DiscussionServiceImpl(
      fakeRepository({
        findThread: async () => threadRow({ status: "ARCHIVED" }) as never,
        updateThread: async (_id, _input, publishedAt) => {
          stamps.push(publishedAt);
        },
      }),
    );

    await neverPublished.updateThread("t1", ADMIN, { status: "PUBLISHED" } as never);
    await alreadyPublished.updateThread("t1", ADMIN, { status: "PUBLISHED" } as never);

    assert.ok(stamps[0] instanceof Date, "first publication is stamped");
    // Restoring from the archive keeps the original date: a reader cares when
    // it was written, not when it was last toggled.
    assert.equal(stamps[1], undefined);
  });
});

describe("overview", () => {
  it("lists every category in a fixed order, including the empty ones", async () => {
    const service = new DiscussionServiceImpl(
      fakeRepository({
        countByCategory: async () => [
          { category: "STRATEGY_PSYCHOLOGY", threadCount: 1 },
          { category: "MARKET_OUTLOOK", threadCount: 9 },
        ],
      }),
    );

    const overview = await service.getOverview(MEMBER);
    assert.deepEqual(overview.categories.map((row) => row.category), [...DISCUSSION_CATEGORIES]);
    assert.equal(overview.categories[0].threadCount, 9);
    assert.equal(overview.categories.find((c) => c.category === "MACRO_ECONOMY")?.threadCount, 0);
  });

  it("flags admins among contributors without changing their rank", async () => {
    const service = new DiscussionServiceImpl(
      fakeRepository({
        findTopContributors: async () => [
          { id: "u1", name: "Rika", role: "MEMBER", commentCount: 4 },
          { id: "u2", name: "Admin", role: "ADMIN", commentCount: 3 },
        ],
      }),
    );

    const overview = await service.getOverview(MEMBER);
    assert.deepEqual(overview.contributors, [
      { id: "u1", name: "Rika", isAdmin: false, commentCount: 4 },
      { id: "u2", name: "Admin", isAdmin: true, commentCount: 3 },
    ]);
  });
});

describe("views", () => {
  it("counts a read only when the caller says it is one, and survives a failure", async () => {
    const seen: string[] = [];
    const service = new DiscussionServiceImpl(
      fakeRepository({
        incrementViewCount: async (id) => {
          seen.push(id);
          throw new Error("counter unavailable");
        },
      }),
    );

    await service.getThread("t1", MEMBER);
    assert.deepEqual(seen, [], "a plain fetch is not a read");

    const thread = await service.getThread("t1", MEMBER, true);
    assert.deepEqual(seen, ["t1"]);
    assert.equal(thread.title, "A thread", "a broken counter must not cost the reader the thread");
  });
});

describe("unique slugs", () => {
  it("suffixes until it finds one that is free", async () => {
    const taken = new Set(["a-thread", "a-thread-2"]);
    let used = "";
    const service = new DiscussionServiceImpl(
      fakeRepository({
        slugTaken: async (slug) => taken.has(slug),
        createThread: async (_authorId, slug) => {
          used = slug;
          return { id: "t1" };
        },
      }),
    );

    await service.createThread(ADMIN, {
      title: "A thread",
      excerpt: "An excerpt here",
      body: "A body here",
      category: "MARKET_OUTLOOK",
      tags: [],
      tickers: [],
      thumbnailUrl: null,
      status: "PUBLISHED",
      isPinned: false,
      isFeatured: false,
      commentsEnabled: true,
    });

    assert.equal(used, "a-thread-3");
  });
});
