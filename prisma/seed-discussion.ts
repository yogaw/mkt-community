import { db } from "../src/database";
import { DiscussionCategoryKind } from "../src/database/prisma/enums";
import type { DiscussionCategory } from "../src/features/discussion/discussion-types";

const HOUR_IN_MS = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR_IN_MS);
}

interface SeedThread {
  id: string;
  authorEmail: string;
  title: string;
  body: string;
  category: DiscussionCategory;
  ticker: string | null;
  isPinned?: boolean;
  isLocked?: boolean;
  /** Opens, not unique readers — the same thing the column counts in production. */
  viewCount: number;
  hoursAgo: number;
  reply: Array<{ authorEmail: string; body: string; hoursAgo: number }>;
}

const threads: SeedThread[] = [
  {
    id: "thread-house-rules",
    authorEmail: "admin@marketinsight.id",
    title: "House rules — read before posting",
    body:
      "Keep it civil and keep it about the market. Share your reasoning, not just a ticker and an arrow. No pump requests, no referral links, and no financial advice framed as certainty. Signals published by Piranha are ideas, not instructions — size them yourself.",
    category: DiscussionCategoryKind.MARKET_OUTLOOK,
    ticker: null,
    isPinned: true,
    isLocked: true,
    viewCount: 3412,
    hoursAgo: 720,
    reply: [],
  },
  {
    id: "thread-ihsg-outlook",
    authorEmail: "admin@marketinsight.id",
    title: "IHSG outlook into the next rate decision",
    body:
      "Foreign flows have turned mildly positive for two weeks running and the index is pressing the top of its recent range. The rate decision is the obvious catalyst. Banks look best positioned if the tone softens; commodity names have already run.",
    category: DiscussionCategoryKind.MARKET_OUTLOOK,
    ticker: null,
    viewCount: 2108,
    hoursAgo: 26,
    reply: [
      {
        authorEmail: "yoga@email.com",
        body:
          "Agreed on banks. The thing I keep watching is whether the rupiah cooperates — every time it slips past a certain point the foreign bid disappears regardless of what the rate does.",
        hoursAgo: 20,
      },
      {
        authorEmail: "rika@email.com",
        body:
          "The range top has rejected three times now on lighter volume each attempt. I would rather see it fail once more and build a base than break out on this kind of participation.",
        hoursAgo: 14,
      },
      {
        authorEmail: "david@email.com",
        body: "Positioned the same way. Long the banks, nothing in commodities until the coal price stops making new highs every week.",
        hoursAgo: 11,
      },
    ],
  },
  {
    id: "thread-cuan-breakout",
    authorEmail: "yoga@email.com",
    title: "CUAN holding above 1,600 — anyone still in?",
    body:
      "Took the entry near the bottom of the published range and it has held above 1,600 for three sessions now. Volume is still healthy. Curious whether people are trimming into 1,700 or letting it run at the second target.",
    category: DiscussionCategoryKind.STOCK_DISCUSSION,
    ticker: "CUAN",
    viewCount: 1842,
    hoursAgo: 5,
    reply: [
      {
        authorEmail: "admin@marketinsight.id",
        body:
          "Still holding the full position here. The thesis was a volume-backed breakout and that has not changed. If it closes back under 1,550 on heavy volume I would reconsider, but nothing in the tape says that yet.",
        hoursAgo: 4,
      },
      {
        authorEmail: "yoga@email.com",
        body: "That is roughly where I landed too. Taking a third off at the first target and trailing the rest.",
        hoursAgo: 3,
      },
      {
        authorEmail: "michael@email.com",
        body: "Trimmed half at 1,690. Not because the thesis broke, just because the position had grown into more of the book than I am comfortable with.",
        hoursAgo: 2,
      },
    ],
  },
  {
    id: "thread-banking-sector",
    authorEmail: "rika@email.com",
    title: "Banking sector: opportunities ahead?",
    body:
      "Loan growth has been steady, margins are holding up better than the rate path suggested they would, and the big four are all trading below where they were when earnings were weaker. Either the market knows something about credit quality that the numbers do not show yet, or this is cheap.",
    category: DiscussionCategoryKind.SECTOR_ANALYSIS,
    ticker: "BBCA",
    viewCount: 1476,
    hoursAgo: 40,
    reply: [
      {
        authorEmail: "david@email.com",
        body:
          "Watch the restructured loan book rather than headline NPL. That is where the pressure shows up first, and it is the line that moves slowest.",
        hoursAgo: 34,
      },
      {
        authorEmail: "jessica@email.com",
        body: "Also worth separating the big four from the rest. The smaller banks are funding themselves at a completely different cost and it does not show in the sector average.",
        hoursAgo: 29,
      },
    ],
  },
  {
    id: "thread-coal-cyclical",
    authorEmail: "david@email.com",
    title: "Coal stocks: cyclical or structural?",
    body:
      "The whole sector has re-rated on a price move that most people expected to fade a year ago. Is this a cycle that has run longer than usual, or has the supply side changed enough that the old mean does not apply any more? It matters, because one of those you trade and the other you own.",
    category: DiscussionCategoryKind.SECTOR_ANALYSIS,
    ticker: "ADRO",
    viewCount: 1133,
    hoursAgo: 62,
    reply: [
      {
        authorEmail: "yoga@email.com",
        body:
          "Cyclical, but a long one. Nobody is financing new capacity, which keeps supply tight for years rather than quarters — that is not the same as structural, it just looks like it from inside.",
        hoursAgo: 55,
      },
      {
        authorEmail: "rika@email.com",
        body: "The part I keep coming back to is that the earnings are real and the payout ratios are high. Even if it is a cycle, you are getting paid to wait for it to end.",
        hoursAgo: 48,
      },
    ],
  },
  {
    id: "thread-rupiah-flows",
    authorEmail: "jessica@email.com",
    title: "The rupiah is doing the talking, not the index",
    body:
      "Every foreign-flow reversal this year has been preceded by the currency, not the index. When the rupiah holds, outflows read as rotation between sectors. When it slips, the same outflow number turns into money actually leaving. Same figure, two completely different meanings.",
    category: DiscussionCategoryKind.MACRO_ECONOMY,
    ticker: null,
    viewCount: 968,
    hoursAgo: 30,
    reply: [
      {
        authorEmail: "admin@marketinsight.id",
        body:
          "This is the right frame. The flow figure on its own tells you volume, not intent — the currency is what tells you which it was.",
        hoursAgo: 24,
      },
    ],
  },
  {
    id: "thread-inflation-print",
    authorEmail: "michael@email.com",
    title: "What the inflation print actually changes",
    body:
      "Core came in softer than the headline again, which is the third month running. If that holds, the argument for staying restrictive gets harder to make. Curious whether anyone is positioning for a cut earlier than the consensus date.",
    category: DiscussionCategoryKind.MACRO_ECONOMY,
    ticker: null,
    viewCount: 742,
    hoursAgo: 88,
    reply: [
      {
        authorEmail: "jessica@email.com",
        body: "Not positioning for it directly, but I have stopped avoiding the rate-sensitive names, which amounts to the same bet in a quieter way.",
        hoursAgo: 80,
      },
    ],
  },
  {
    id: "thread-raja-stop",
    authorEmail: "yoga@email.com",
    title: "Lessons from the RAJA stop-out",
    body:
      "Worth talking about the one that did not work rather than only the winners. The setup was a momentum trade into a support shelf, the shelf broke on higher volume, and the stop did exactly what it was there for. Small loss, no drama. What would you have done differently?",
    category: DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
    ticker: "RAJA",
    viewCount: 1094,
    hoursAgo: 50,
    reply: [
      {
        authorEmail: "admin@marketinsight.id",
        body:
          "Nothing, honestly. The stop was placed just under the level the whole idea rested on, so when the level went the reason to hold went with it. Respecting that is the entire job.",
        hoursAgo: 44,
      },
      {
        authorEmail: "michael@email.com",
        body: "The only thing I would change is talking about it sooner. A stop you explain out loud is a stop you take; one you sit on quietly turns into an average-down.",
        hoursAgo: 38,
      },
    ],
  },
  {
    id: "thread-risk-volatile",
    authorEmail: "michael@email.com",
    title: "How do you manage risk in a volatile market?",
    body:
      "Position sizing, stop placement and mindset. In a quiet tape I can hold a full position through noise without thinking about it. In this one I find myself watching intraday, which is usually the sign that the size is wrong rather than the market.",
    category: DiscussionCategoryKind.STRATEGY_PSYCHOLOGY,
    ticker: null,
    viewCount: 913,
    hoursAgo: 96,
    reply: [
      {
        authorEmail: "rika@email.com",
        body:
          "If you are checking it intraday, it is too big. That has been true for me every single time, and I still have to relearn it about twice a year.",
        hoursAgo: 90,
      },
      {
        authorEmail: "jessica@email.com",
        body: "I size off the stop rather than off conviction now. Conviction is the thing that is wrong most often.",
        hoursAgo: 84,
      },
      {
        authorEmail: "david@email.com",
        body: "Same, and I widened the stop instead of tightening it when volatility picked up. Smaller position, more room — the risk in rupiah stays the same.",
        hoursAgo: 79,
      },
    ],
  },
  {
    id: "thread-dividend-season",
    authorEmail: "yoga@email.com",
    title: "How are people playing dividend season?",
    body:
      "With several ex-dates coming up I am curious how others approach it — hold through the ex-date for the cash, or sell into the run-up and skip the drop? I have done both and honestly cannot tell which served me better.",
    category: DiscussionCategoryKind.STOCK_DISCUSSION,
    ticker: null,
    viewCount: 651,
    hoursAgo: 74,
    reply: [
      {
        authorEmail: "rika@email.com",
        body: "Hold through, but only where I wanted to own the thing anyway. Buying something for the dividend and then being stuck with it afterwards is how you end up with a portfolio you did not choose.",
        hoursAgo: 66,
      },
    ],
  },
];

export async function seedDiscussion(): Promise<void> {
  const users = await db.user.findMany({ select: { id: true, email: true } });
  const idByEmail = new Map(users.map((user) => [user.email, user.id]));

  let replyCount = 0;
  for (const thread of threads) {
    const authorId = idByEmail.get(thread.authorEmail);
    if (!authorId) {
      continue;
    }
    const createdAt = hoursAgo(thread.hoursAgo);
    const lastReply = thread.reply.at(-1);
    const data = {
      authorId,
      title: thread.title,
      body: thread.body,
      category: thread.category,
      ticker: thread.ticker,
      viewCount: thread.viewCount,
      isPinned: thread.isPinned ?? false,
      isLocked: thread.isLocked ?? false,
      createdAt,
      // Drives "active" sorting: the newest reply, or the post itself.
      updatedAt: lastReply ? hoursAgo(lastReply.hoursAgo) : createdAt,
    };

    await db.discussionThread.upsert({
      where: { id: thread.id },
      update: data,
      create: { id: thread.id, ...data },
    });

    // Rebuilt each run so replies never accumulate across seeds.
    await db.discussionReply.deleteMany({ where: { threadId: thread.id } });
    for (const [index, reply] of thread.reply.entries()) {
      const replyAuthorId = idByEmail.get(reply.authorEmail);
      if (!replyAuthorId) {
        continue;
      }
      await db.discussionReply.create({
        data: {
          id: `${thread.id}-reply-${index + 1}`,
          threadId: thread.id,
          authorId: replyAuthorId,
          body: reply.body,
          createdAt: hoursAgo(reply.hoursAgo),
        },
      });
      replyCount += 1;
    }
  }

  console.log(`Seeded ${threads.length} discussion threads and ${replyCount} replies`);
}
