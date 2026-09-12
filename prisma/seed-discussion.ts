import { db } from "../src/database";
import { DiscussionCategoryKind } from "../src/database/prisma/enums";
import { toSlug } from "../src/features/discussion/slug";
import type { DiscussionCategory } from "../src/features/discussion/discussion-types";

const HOUR_IN_MS = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR_IN_MS);
}

interface SeedComment {
  authorEmail: string;
  body: string;
  hoursAgo: number;
  /** Index of the top-level comment this answers, within the same thread. */
  replyTo?: number;
  likes?: string[];
}

interface SeedThread {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: DiscussionCategory;
  tags: string[];
  tickers: string[];
  isPinned?: boolean;
  isFeatured?: boolean;
  isLocked?: boolean;
  commentsEnabled?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  viewCount: number;
  hoursAgo: number;
  likes?: string[];
  comment: SeedComment[];
}

/* Every thread is authored by the desk — the board's whole premise is that
   only admins open one. Members appear in the comments, which is where member
   participation actually lives. */
const ADMIN = "admin@marketinsight.id";

const threads: SeedThread[] = [
  {
    id: "thread-market-outlook-sep",
    title: "Market Outlook — September 2026",
    excerpt: "Global market update, Fed decision, and the IHSG outlook into the final quarter.",
    category: DiscussionCategoryKind.MARKET_OUTLOOK,
    tags: ["Monthly Outlook", "IHSG", "Fed"],
    tickers: ["BBCA", "BMRI", "ADRO"],
    isPinned: true,
    isFeatured: true,
    viewCount: 3412,
    hoursAgo: 30,
    likes: ["yoga@email.com", "rika@email.com", "david@email.com"],
    body: `In this month's outlook we work through five things:

- Where global markets sit going into the last quarter
- The Fed decision and what it actually changes here
- IHSG's technical position against its recent range
- The sectors carrying the index, and the ones being carried
- What is on our radar but not yet a signal

## Global

Equity markets went into September priced for a soft landing and have mostly stayed there. The ten-year has held near the top of its range, which keeps a lid on emerging-market risk appetite without actively pushing money out.

## The Fed decision

The decision matters here less through rates and more through the rupiah. A softer tone widens the room Bank Indonesia has, and that shows up in the banks before it shows up anywhere else.

> The flow figure on its own tells you volume, not intent. The currency tells you which it was.

## IHSG

The index has pressed the top of its recent range three times now, each attempt on lighter volume than the last. That is not a failure, but it is not a breakout either.

## Sectors

$BBCA and $BMRI are where a softer rate path lands first. $ADRO and the coal complex have already run — the earnings are real, but so is the move.

Let's use this thread to discuss your thoughts and questions.`,
    comment: [
      {
        authorEmail: "yoga@email.com",
        hoursAgo: 26,
        body: "Agreed on banks. The thing I keep watching is whether the rupiah cooperates — every time it slips past a certain point the foreign bid disappears regardless of what the rate does.",
        likes: [ADMIN, "rika@email.com"],
      },
      {
        authorEmail: ADMIN,
        hoursAgo: 25,
        replyTo: 0,
        body: "That is the right frame. The rupiah is the transmission channel; the rate decision is just the thing that moves it.",
        likes: ["yoga@email.com"],
      },
      {
        authorEmail: "rika@email.com",
        hoursAgo: 22,
        body: "The range top has rejected three times now on lighter volume each attempt. I would rather see it fail once more and build a base than break out on this kind of participation.",
        likes: ["david@email.com"],
      },
      {
        authorEmail: "david@email.com",
        hoursAgo: 19,
        replyTo: 2,
        body: "Same read. Volume on the third attempt was the tell — nobody was chasing it.",
      },
      {
        authorEmail: "michael@email.com",
        hoursAgo: 14,
        body: "What would make you change the sector call? Asking because I am positioned the other way and want to know what I should be watching.",
      },
      {
        authorEmail: ADMIN,
        hoursAgo: 12,
        replyTo: 4,
        body: "Credit quality in the restructured book. If that deteriorates, the rate argument stops mattering and the banks get repriced on something else entirely. It is the slowest line to move, which is exactly why it is worth watching early.",
        likes: ["michael@email.com", "jessica@email.com"],
      },
    ],
  },
  {
    id: "thread-ihsg-after-fed",
    title: "IHSG After Fed Decision",
    excerpt: "What's next for the Indonesian market once the decision is behind us?",
    category: DiscussionCategoryKind.MACRO_ECONOMY,
    tags: ["Fed", "Rupiah", "IHSG"],
    tickers: [],
    viewCount: 2108,
    hoursAgo: 54,
    likes: ["rika@email.com", "michael@email.com"],
    body: `Every foreign-flow reversal this year has been preceded by the currency, not the index.

When the rupiah holds, outflows read as rotation between sectors. When it slips, the same outflow number turns into money actually leaving. Same figure, two completely different meanings.

## What to watch this week

1. The rupiah against its recent range, not against a round number
2. Whether foreign net selling stays in the regular market or moves to negotiated
3. Bond yields — they move before equities on this particular trade

What are you positioning for?`,
    comment: [
      {
        authorEmail: "jessica@email.com",
        hoursAgo: 48,
        body: "Not positioning for a cut directly, but I have stopped avoiding the rate-sensitive names, which amounts to the same bet in a quieter way.",
        likes: [ADMIN],
      },
      {
        authorEmail: "david@email.com",
        hoursAgo: 40,
        body: "The bond market has been ahead of equities on every one of these this year. If you only watch one thing, watch the ten-year.",
        likes: ["rika@email.com", "yoga@email.com"],
      },
    ],
  },
  {
    id: "thread-banking-sector",
    title: "Banking Sector: Opportunities Ahead?",
    excerpt: "Discussing fundamentals, valuation, and the key players in Indonesian banking.",
    category: DiscussionCategoryKind.STOCK_DISCUSSION,
    tags: ["Banks", "Valuation"],
    tickers: ["BBCA", "BMRI", "BBRI", "BBNI"],
    viewCount: 1842,
    hoursAgo: 76,
    likes: ["yoga@email.com"],
    body: `Loan growth has been steady, margins are holding up better than the rate path suggested they would, and the big four are all trading below where they were when earnings were weaker.

Either the market knows something about credit quality that the numbers do not show yet, or this is cheap.

## The case for

- Net interest margins have compressed less than modelled
- Loan growth is broad rather than concentrated in one segment
- Capital ratios leave room for the dividend to hold

## The case against

- The restructured book has not been tested by a real slowdown
- Foreign ownership is still heavy, which cuts both ways
- Smaller banks fund themselves at a completely different cost, and the sector average hides it

Where do you land?`,
    comment: [
      {
        authorEmail: "david@email.com",
        hoursAgo: 70,
        body: "Watch the restructured loan book rather than headline NPL. That is where the pressure shows up first, and it is the line that moves slowest.",
        likes: [ADMIN, "rika@email.com", "jessica@email.com"],
      },
      {
        authorEmail: "jessica@email.com",
        hoursAgo: 64,
        body: "Also worth separating the big four from the rest. The smaller banks are funding themselves at a completely different cost and it does not show in the sector average.",
        likes: ["david@email.com"],
      },
      {
        authorEmail: "rika@email.com",
        hoursAgo: 58,
        replyTo: 1,
        body: "This is the part most sector screens miss. $BBCA and a second-tier bank are not the same instrument, whatever the sector index says.",
      },
    ],
  },
  {
    id: "thread-coal-cyclical",
    title: "Coal Stocks: Cyclical or Structural?",
    excerpt: "Is this a short-term trade or a long-term opportunity?",
    category: DiscussionCategoryKind.SECTOR_ANALYSIS,
    tags: ["Coal", "Commodities", "Energy"],
    tickers: ["ADRO", "ITMG", "PTBA", "BUMI"],
    viewCount: 1476,
    hoursAgo: 98,
    likes: ["michael@email.com", "david@email.com"],
    body: `The whole sector has re-rated on a price move that most people expected to fade a year ago.

Is this a cycle that has run longer than usual, or has the supply side changed enough that the old mean does not apply any more? It matters, because one of those you trade and the other you own.

## The supply argument

Nobody is financing new capacity. That keeps supply tight for years rather than quarters — which is not the same as structural, it just looks like it from inside.

## The demand argument

Asian thermal demand has not rolled over on the timeline the energy-transition models assumed. Whether that is a delay or a different path is the entire question.

$ADRO, $ITMG and $PTBA are all paying out heavily while this runs. Even if it is a cycle, you are being paid to wait for it to end.`,
    comment: [
      {
        authorEmail: "yoga@email.com",
        hoursAgo: 90,
        body: "Cyclical, but a long one. Nobody is financing new capacity, which keeps supply tight for years rather than quarters — that is not structural, it just looks like it from inside.",
        likes: [ADMIN, "michael@email.com"],
      },
      {
        authorEmail: "rika@email.com",
        hoursAgo: 84,
        body: "The part I keep coming back to is that the earnings are real and the payout ratios are high. Even if it is a cycle, you are getting paid to wait for it to end.",
        likes: ["yoga@email.com", "david@email.com"],
      },
    ],
  },
  {
    id: "thread-risk-volatile",
    title: "How Do You Manage Risk in a Volatile Market?",
    excerpt: "Position sizing, stop loss, and mindset when the tape will not sit still.",
    category: DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
    tags: ["Risk", "Position Sizing", "Psychology"],
    tickers: [],
    viewCount: 1133,
    hoursAgo: 120,
    body: `Three things worth separating, because they get discussed as one:

1. **Position sizing** — how much of the book is in the idea
2. **Stop placement** — where the idea is proven wrong
3. **Mindset** — whether you can actually sit through the middle

In a quiet tape most people can hold a full position through noise without thinking about it. In this one, a lot of us find ourselves watching intraday — which is usually the sign that the size is wrong rather than the market.

How are you handling it?`,
    comment: [
      {
        authorEmail: "rika@email.com",
        hoursAgo: 112,
        body: "If you are checking it intraday, it is too big. That has been true for me every single time, and I still have to relearn it about twice a year.",
        likes: [ADMIN, "michael@email.com", "jessica@email.com", "david@email.com"],
      },
      {
        authorEmail: "jessica@email.com",
        hoursAgo: 106,
        body: "I size off the stop rather than off conviction now. Conviction is the thing that is wrong most often.",
        likes: ["rika@email.com", "yoga@email.com"],
      },
      {
        authorEmail: "david@email.com",
        hoursAgo: 100,
        replyTo: 1,
        body: "Same, and I widened the stop instead of tightening it when volatility picked up. Smaller position, more room — the risk in rupiah stays the same.",
        likes: ["jessica@email.com"],
      },
      {
        authorEmail: "michael@email.com",
        hoursAgo: 94,
        body: "The mindset one is underrated. A stop you have explained out loud to somebody is a stop you take; one you sit on quietly turns into an average-down.",
        likes: [ADMIN],
      },
    ],
  },
  {
    id: "thread-usdidr-outlook",
    title: "USD/IDR Outlook",
    excerpt: "Where the rupiah goes from here, and what it means for foreign flow into IDX.",
    category: DiscussionCategoryKind.MACRO_ECONOMY,
    tags: ["Rupiah", "FX", "Foreign Flow"],
    tickers: [],
    viewCount: 968,
    hoursAgo: 144,
    body: `The rupiah is the variable that decides whether foreign selling is rotation or exit.

## What we are watching

- The interbank rate against its recent range, not against round numbers
- The gap between JISDOR and the market rate, which widens before the market moves
- Whether bond outflows lead equity outflows, as they have all year

Nothing here is a call. It is the framework we use to read the flow figure, and it is worth arguing with.`,
    comment: [
      {
        authorEmail: "michael@email.com",
        hoursAgo: 136,
        body: "The JISDOR gap is a good one. It is published daily and almost nobody watches it.",
        likes: [ADMIN],
      },
    ],
  },
  {
    id: "thread-swing-screener",
    title: "Best Screener for Swing Trading?",
    excerpt: "What people actually use to find setups, and what is noise.",
    category: DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
    tags: ["Tools", "Screening"],
    tickers: [],
    viewCount: 742,
    hoursAgo: 168,
    body: `A practical thread rather than a market call.

Most screeners return a hundred names and none of them are tradeable. The useful ones tend to filter on two or three conditions, not twenty.

What is actually in your screen, and what did you take out once you realised it was not adding anything?`,
    comment: [
      {
        authorEmail: "yoga@email.com",
        hoursAgo: 160,
        body: "Liquidity first, always. If the average value traded cannot absorb my position, nothing else about the setup matters.",
        likes: ["rika@email.com", "david@email.com"],
      },
      {
        authorEmail: "jessica@email.com",
        hoursAgo: 150,
        body: "I removed every oscillator. They agreed with whatever I already thought and I could not find a single case where one changed my mind.",
        likes: [ADMIN, "yoga@email.com"],
      },
    ],
  },
];

export async function seedDiscussion(): Promise<void> {
  const users = await db.user.findMany({ select: { id: true, email: true } });
  const idByEmail = new Map(users.map((user) => [user.email, user.id]));
  const adminId = idByEmail.get(ADMIN);
  if (!adminId) {
    console.log("Skipped discussion seed: no admin user");
    return;
  }

  let commentCount = 0;

  for (const thread of threads) {
    const createdAt = hoursAgo(thread.hoursAgo);
    const lastComment = thread.comment.at(-1);
    const status = thread.status ?? "PUBLISHED";

    const data = {
      authorId: adminId,
      slug: toSlug(thread.title),
      title: thread.title,
      excerpt: thread.excerpt,
      body: thread.body,
      category: thread.category,
      status,
      tags: thread.tags,
      tickers: thread.tickers,
      thumbnailUrl: null,
      viewCount: thread.viewCount,
      isPinned: thread.isPinned ?? false,
      isFeatured: thread.isFeatured ?? false,
      isLocked: thread.isLocked ?? false,
      commentsEnabled: thread.commentsEnabled ?? true,
      publishedAt: status === "DRAFT" ? null : createdAt,
      createdAt,
      // Drives "recently updated" sorting: the newest comment, or the post.
      updatedAt: lastComment ? hoursAgo(lastComment.hoursAgo) : createdAt,
    };

    await db.discussionThread.upsert({
      where: { id: thread.id },
      update: data,
      create: { id: thread.id, ...data },
    });

    // Rebuilt each run so comments and reactions never accumulate across seeds.
    await db.discussionReply.deleteMany({ where: { threadId: thread.id } });
    await db.discussionReaction.deleteMany({ where: { threadId: thread.id } });

    for (const email of thread.likes ?? []) {
      const userId = idByEmail.get(email);
      if (userId) {
        await db.discussionReaction.create({ data: { threadId: thread.id, userId } });
      }
    }

    // Two passes: every top-level comment exists before a reply points at one.
    const idByIndex = new Map<number, string>();

    for (const [index, comment] of thread.comment.entries()) {
      const authorId = idByEmail.get(comment.authorEmail);
      if (!authorId) {
        continue;
      }
      const parentId =
        comment.replyTo === undefined ? null : (idByIndex.get(comment.replyTo) ?? null);

      const created = await db.discussionReply.create({
        data: {
          id: `${thread.id}-c${index + 1}`,
          threadId: thread.id,
          authorId,
          parentId,
          body: comment.body,
          createdAt: hoursAgo(comment.hoursAgo),
        },
        select: { id: true },
      });

      if (parentId === null) {
        idByIndex.set(index, created.id);
      }
      commentCount += 1;

      for (const email of comment.likes ?? []) {
        const userId = idByEmail.get(email);
        if (userId) {
          await db.commentReaction.create({ data: { replyId: created.id, userId } });
        }
      }
    }
  }

  // A couple of follows, so the state is exercised rather than only written.
  const follower = idByEmail.get("yoga@email.com");
  if (follower) {
    await db.discussionFollow.deleteMany({ where: { userId: follower } });
    await db.discussionFollow.create({
      data: { userId: follower, threadId: "thread-market-outlook-sep" },
    });
  }

  console.log(`Seeded ${threads.length} discussions and ${commentCount} comments`);
}
