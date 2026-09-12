import { db } from "../src/database";

const HOUR_IN_MS = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR_IN_MS);
}

interface SeedThread {
  id: string;
  authorEmail: string;
  title: string;
  body: string;
  ticker: string | null;
  isPinned?: boolean;
  isLocked?: boolean;
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
    ticker: null,
    isPinned: true,
    isLocked: true,
    hoursAgo: 720,
    reply: [],
  },
  {
    id: "thread-cuan-breakout",
    authorEmail: "yoga@email.com",
    title: "CUAN holding above 1,600 — anyone still in?",
    body:
      "Took the entry near the bottom of the published range and it has held above 1,600 for three sessions now. Volume is still healthy. Curious whether people are trimming into 1,700 or letting it run at the second target.",
    ticker: "CUAN",
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
    ],
  },
  {
    id: "thread-ihsg-outlook",
    authorEmail: "admin@marketinsight.id",
    title: "IHSG outlook into the next rate decision",
    body:
      "Foreign flows have turned mildly positive for two weeks running and the index is pressing the top of its recent range. The rate decision is the obvious catalyst. Banks look best positioned if the tone softens; commodity names have already run.",
    ticker: null,
    hoursAgo: 26,
    reply: [
      {
        authorEmail: "yoga@email.com",
        body:
          "Agreed on banks. The thing I keep watching is whether the rupiah cooperates — every time it slips past a certain point the foreign bid disappears regardless of what the rate does.",
        hoursAgo: 20,
      },
    ],
  },
  {
    id: "thread-raja-stop",
    authorEmail: "yoga@email.com",
    title: "Lessons from the RAJA stop-out",
    body:
      "Worth talking about the one that did not work rather than only the winners. The setup was a momentum trade into a support shelf, the shelf broke on higher volume, and the stop did exactly what it was there for. Small loss, no drama. What would you have done differently?",
    ticker: "RAJA",
    hoursAgo: 50,
    reply: [
      {
        authorEmail: "admin@marketinsight.id",
        body:
          "Nothing, honestly. The stop was placed just under the level the whole idea rested on, so when the level went the reason to hold went with it. Respecting that is the entire job.",
        hoursAgo: 44,
      },
    ],
  },
  {
    id: "thread-dividend-season",
    authorEmail: "yoga@email.com",
    title: "How are people playing dividend season?",
    body:
      "With several ex-dates coming up I am curious how others approach it — hold through the ex-date for the cash, or sell into the run-up and skip the drop? I have done both and honestly cannot tell which served me better.",
    ticker: null,
    hoursAgo: 74,
    reply: [],
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
      ticker: thread.ticker,
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
