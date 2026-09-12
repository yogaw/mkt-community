import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DiscussionServiceImpl } from "./discussion-service";
import { DISCUSSION_CATEGORIES } from "../discussion-types";
import type {
  CategoryCountRow,
  ContributorRow,
  DiscussionRepository,
} from "../repository/discussion-repository";

function repositoryReturning(
  counts: CategoryCountRow[],
  contributors: ContributorRow[],
  onIncrement?: (id: string) => void,
): DiscussionRepository {
  const missing = () => {
    throw new Error("not used by these tests");
  };
  return {
    findThreads: missing,
    countByCategory: async () => counts,
    findTopContributors: async () => contributors,
    incrementViewCount: async (id: string) => {
      onIncrement?.(id);
    },
    findThreadById: missing,
    createThread: missing,
    createReply: missing,
    moderateThread: missing,
    softDeleteThread: missing,
    findThreadOwner: missing,
  } as unknown as DiscussionRepository;
}

describe("discussion overview", () => {
  it("lists every category, including the empty ones", async () => {
    const service = new DiscussionServiceImpl(
      repositoryReturning([{ category: "MACRO_ECONOMY", threadCount: 3 }], []),
    );

    const overview = await service.getOverview();

    // A room that exists but is empty is a more useful thing to show than a
    // gap in the row of cards.
    assert.deepEqual(
      overview.categories.map((row) => row.category),
      [...DISCUSSION_CATEGORIES],
    );
    assert.equal(overview.categories.find((row) => row.category === "MACRO_ECONOMY")?.threadCount, 3);
    assert.equal(overview.categories.find((row) => row.category === "MARKET_OUTLOOK")?.threadCount, 0);
  });

  it("keeps the card order fixed, whatever order the counts arrive in", async () => {
    const service = new DiscussionServiceImpl(
      repositoryReturning(
        [
          { category: "STRATEGY_PSYCHOLOGY", threadCount: 1 },
          { category: "MARKET_OUTLOOK", threadCount: 9 },
        ],
        [],
      ),
    );

    const overview = await service.getOverview();
    assert.equal(overview.categories[0].category, "MARKET_OUTLOOK");
    assert.equal(overview.categories.at(-1)?.category, "STRATEGY_PSYCHOLOGY");
  });

  it("flags admins among the contributors without changing their rank", async () => {
    const service = new DiscussionServiceImpl(
      repositoryReturning(
        [],
        [
          { id: "u1", name: "Rika", role: "MEMBER", replyCount: 4 },
          { id: "u2", name: "Admin", role: "ADMIN", replyCount: 3 },
        ],
      ),
    );

    const overview = await service.getOverview();
    assert.deepEqual(overview.contributors, [
      { id: "u1", name: "Rika", isAdmin: false, replyCount: 4 },
      { id: "u2", name: "Admin", isAdmin: true, replyCount: 3 },
    ]);
  });
});

describe("thread views", () => {
  it("counts a read only when the caller says it is one", async () => {
    const seen: string[] = [];
    const repository = repositoryReturning([], [], (id) => seen.push(id));
    repository.findThreadById = async () =>
      ({
        id: "t1",
        title: "T",
        body: "B",
        category: "MARKET_OUTLOOK",
        ticker: null,
        viewCount: 10,
        isPinned: false,
        isLocked: false,
        createdAt: new Date("2026-09-01"),
        author: { id: "u1", name: "Rika", role: "MEMBER" },
        reply: [],
      }) as never;

    const service = new DiscussionServiceImpl(repository);

    await service.getThread("t1", "u1");
    assert.deepEqual(seen, [], "a plain fetch is not a read");

    await service.getThread("t1", "u1", true);
    assert.deepEqual(seen, ["t1"]);
  });

  it("still returns the thread when the counter fails", async () => {
    const repository = repositoryReturning([], []);
    repository.incrementViewCount = async () => {
      throw new Error("counter unavailable");
    };
    repository.findThreadById = async () =>
      ({
        id: "t1",
        title: "Still here",
        body: "B",
        category: "MARKET_OUTLOOK",
        ticker: null,
        viewCount: 10,
        isPinned: false,
        isLocked: false,
        createdAt: new Date("2026-09-01"),
        author: { id: "u1", name: "Rika", role: "MEMBER" },
        reply: [],
      }) as never;

    const thread = await new DiscussionServiceImpl(repository).getThread("t1", "u1", true);
    assert.equal(thread.title, "Still here");
  });
});
