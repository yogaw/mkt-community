import "dotenv/config";
import { db } from "../src/database";
import {
  LiveSessionPlatformKind,
  LiveSessionStatusKind,
  MembershipStatusKind,
  UserRoleKind,
  VideoProviderKind,
} from "../src/database/prisma/enums";
import { hashPassword } from "../src/lib/auth/password";
import { seedStocks } from "./seed-stocks";
import { seedSignals, seedSignalWatchlist } from "./seed-signals";
import { seedMarketIndex } from "./seed-market-index";
import { seedNewsSections } from "./seed-news-sections";
import { seedDiscussion } from "./seed-discussion";

const HOUR_IN_MS = 60 * 60 * 1000;

const seedUsers = [
  {
    email: "admin@marketinsight.id",
    name: "Influencer Admin",
    password: "admin123",
    role: UserRoleKind.ADMIN,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
  {
    email: "yoga@email.com",
    name: "Yoga Wigardo",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
  {
    email: "inactive.member@email.com",
    name: "Inactive Member",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.INACTIVE,
  },
  // Enough voices for the board to look like a board. Without them every
  // thread is a conversation between the same two accounts.
  {
    email: "rika@email.com",
    name: "Rika Anindita",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
  {
    email: "david@email.com",
    name: "David Kurniawan",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
  {
    email: "michael@email.com",
    name: "Michael Tanuwijaya",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
  {
    email: "jessica@email.com",
    name: "Jessica Halim",
    password: "member123",
    role: UserRoleKind.MEMBER,
    membershipStatus: MembershipStatusKind.ACTIVE,
  },
];

const seedCategories = [
  { name: "Market Outlook", slug: "market-outlook" },
  { name: "Stock Analysis", slug: "stock-analysis" },
  { name: "Market News", slug: "market-news" },
  { name: "Education", slug: "education" },
  { name: "Market Recap", slug: "market-recap" },
  { name: "Community Update", slug: "community-update" },
];

const seedVideos = [
  {
    id: "video-weekly-market-outlook",
    title: "Weekly Market Outlook",
    description:
      "Key themes to watch this week: rate cut expectations, banking sector earnings and how foreign flow is shaping the index. We break down the levels that matter for the week ahead.",
    categorySlug: "market-outlook",
    isFeatured: true,
    publishedAt: () => new Date(Date.now() - 2 * HOUR_IN_MS),
    durationSeconds: 24 * 60,
    thumbnailUrl: "/video-placeholder-market.svg",
  },
  {
    id: "video-bbca-deep-dive",
    title: "BBCA Deep Dive",
    description:
      "A structured look at BBCA fundamentals: loan growth, net interest margin trend and what the latest quarterly results mean for the investment case.",
    categorySlug: "stock-analysis",
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 24 * HOUR_IN_MS),
    durationSeconds: 18 * 60,
    thumbnailUrl: "/video-placeholder-analysis.svg",
  },
  {
    id: "video-ihsg-weekly-recap",
    title: "IHSG Weekly Recap",
    description:
      "Everything that moved the index this week, sector by sector, plus the weekly winners and losers and what to keep an eye on next week.",
    categorySlug: "market-recap",
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 3 * 24 * HOUR_IN_MS),
    durationSeconds: 32 * 60,
    thumbnailUrl: "/video-placeholder-market.svg",
  },
];

const episodeCategorySlugs = ["market-outlook", "stock-analysis", "education", "market-recap"];

const episodeThumbnails = [
  "/video-placeholder-podcast.svg",
  "/video-placeholder-market.svg",
  "/video-placeholder-analysis.svg",
];

const extraSeedVideos = Array.from({ length: 11 }, (_, index) => {
  const episode = index + 1;
  return {
    id: `video-ep-${String(episode).padStart(2, "0")}`,
    title: `Market Insights Episode ${episode}`,
    description: `Episode ${episode} of the weekly market insights series, covering the moves that mattered this week and what to watch next.`,
    categorySlug: episodeCategorySlugs[index % episodeCategorySlugs.length],
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - (4 + episode) * 24 * HOUR_IN_MS),
    durationSeconds: (15 + episode) * 60,
    thumbnailUrl: episodeThumbnails[index % episodeThumbnails.length],
  };
});

const seedAnnouncements = [
  {
    id: "ann-live-session-tonight",
    title: "Live Session Tonight",
    content:
      "Join us tonight at 19:00 WIB for the weekly market discussion. We will review this week's market recap, preview next week's calendar and answer member questions live.",
    ctaLabel: "Join Session",
    ctaUrl: "https://zoom.us/j/9876543210",
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 5 * HOUR_IN_MS),
  },
  {
    id: "ann-september-challenge",
    title: "September Community Challenge",
    content:
      "Take part in this month's community challenge: share your best thesis for one index heavyweight by the end of the month. The most insightful write-ups get featured in the next live session.",
    ctaLabel: "Join Session",
    ctaUrl: "https://zoom.us/j/9876543210",
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 16 * HOUR_IN_MS),
  },
  {
    id: "ann-scheduled-maintenance",
    title: "Scheduled Maintenance This Sunday",
    content:
      "The platform will be briefly unavailable this Sunday between 02:00 and 04:00 WIB for scheduled maintenance. No action is needed from you, and all content will be preserved.",
    ctaLabel: null,
    ctaUrl: null,
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 48 * HOUR_IN_MS),
  },
  {
    id: "ann-membership-billing-update",
    title: "Membership Billing Update",
    content:
      "Starting next cycle, membership renewals will be invoiced through the new billing portal. You will receive an email with your invoice five days before each renewal date.",
    ctaLabel: "Learn More",
    ctaUrl: "https://example.com/billing-info",
    isFeatured: false,
    publishedAt: () => new Date(Date.now() - 90 * HOUR_IN_MS),
  },
];

const seedNews = [
  {
    id: "news-banking-sector-update",
    title: "Banking Sector Update",
    summary:
      "Big-four banks posted steady loan growth in the latest quarter, with net interest margins holding up despite rate pressure.",
    content:
      "The latest quarterly results from the big-four banks show steady loan growth and resilient net interest margins. Deposit competition remains intense, but management guidance points to stable margins through the next quarter. We continue to watch credit cost trends and capital ratios as the key swing factors for the sector.",
    categorySlug: "market-news",
    isFeatured: false,
    imageUrl: null,
    publishedAt: () => new Date(Date.now() - 8 * HOUR_IN_MS),
  },
  {
    id: "news-foreign-flow-banking",
    title: "Foreign Flow Returns to Banking Stocks",
    summary: "Foreign investors turned net buyers of banking stocks this week after three weeks of outflows.",
    content:
      "Foreign investors turned net buyers of banking stocks this week after three consecutive weeks of outflows. The shift follows softer global rates and a more stable currency backdrop. Historically, sustained foreign inflows into the banking sector have coincided with index-level rallies, making the coming weeks an important confirmation window.",
    categorySlug: "market-news",
    isFeatured: false,
    imageUrl: null,
    publishedAt: () => new Date(Date.now() - 24 * HOUR_IN_MS),
  },
];

const extraNewsTitles = [
  "BBCA Quarterly Results: What Stands Out",
  "Rupiah Steadies as Dollar Rally Cools",
  "Retail Sales Beat Expectations in August",
  "New Listings to Watch This Quarter",
  "Index Rebalancing: What Changes for Holders",
  "Commodity Exporters Face Softer Demand",
  "Community Q&A: Your Top Questions Answered",
];

const extraNewsCategorySlugs = ["stock-analysis", "market-news", "community-update", "education", "market-news", "market-news", "community-update"];

const extraSeedNews = extraNewsTitles.map((title, index) => ({
  id: `news-update-${String(index + 1).padStart(2, "0")}`,
  title,
  summary: `Short briefing: ${title.toLowerCase()}. What happened, why it matters for your portfolio and what we are watching next.`,
  content: `${title}.\n\nMarkets moved on a mix of domestic and global cues this week. In this briefing we walk through the data, put it in the context of the current trend and outline the scenarios we consider most likely for the coming weeks.\n\nAs always, this is information rather than a recommendation, so weigh it against your own strategy and risk tolerance.`,
  categorySlug: extraNewsCategorySlugs[index],
  isFeatured: false,
  imageUrl: index < 3 ? `https://picsum.photos/seed/mi-news-${index + 1}/1200/675` : null,
  publishedAt: () => new Date(Date.now() - (30 + index * 10) * HOUR_IN_MS),
}));

const bbcAnnouncement = {
  id: "ann-bbca-special-coverage",
  title: "BBCA Special Coverage Tonight",
  content:
    "Tonight after market close we break down the BBCA quarterly results live: loan growth, margins and the outlook for the banking sector. Bring your questions.",
  ctaLabel: null,
  ctaUrl: null,
  isFeatured: false,
  publishedAt: () => new Date(Date.now() - 2 * HOUR_IN_MS),
};

function nextWednesday1900Wib(now: Date): Date {
  // 19:00 WIB is 12:00 UTC (UTC+7, no daylight saving)
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  let addDays = (3 - candidate.getUTCDay() + 7) % 7; // Wednesday is day 3
  if (addDays === 0 && candidate.getTime() <= now.getTime()) {
    addDays = 7;
  }
  candidate.setUTCDate(candidate.getUTCDate() + addDays);
  return candidate;
}

async function main(): Promise<void> {
  for (const { password, ...userData } of seedUsers) {
    await db.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData, password: await hashPassword(password) },
    });
    console.log(`Seeded ${userData.email} — ${userData.role} / ${userData.membershipStatus}`);
  }

  for (const category of seedCategories) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log(`Seeded ${seedCategories.length} categories`);

  for (const video of [...seedVideos, ...extraSeedVideos]) {
    const { categorySlug, publishedAt, ...videoData } = video;
    await db.video.upsert({
      where: { id: video.id },
      update: {
        ...videoData,
        publishedAt: publishedAt(),
        category: { connect: { slug: categorySlug } },
      },
      create: {
        ...videoData,
        publishedAt: publishedAt(),
        provider: VideoProviderKind.YOUTUBE,
        videoUrl: "https://www.youtube.com/watch?v=replace-in-admin",
        category: { connect: { slug: categorySlug } },
      },
    });
  }
  console.log(`Seeded ${seedVideos.length + extraSeedVideos.length} videos`);

  for (const announcement of [...seedAnnouncements, bbcAnnouncement]) {
    const { publishedAt, ...announcementData } = announcement;
    await db.announcement.upsert({
      where: { id: announcement.id },
      update: { ...announcementData, publishedAt: publishedAt() },
      create: { ...announcementData, publishedAt: publishedAt() },
    });
  }
  console.log(`Seeded ${seedAnnouncements.length + 1} announcements`);

  for (const news of [...seedNews, ...extraSeedNews]) {
    const { categorySlug, publishedAt, ...newsData } = news;
    await db.news.upsert({
      where: { id: news.id },
      update: { ...newsData, publishedAt: publishedAt(), category: { connect: { slug: categorySlug } } },
      create: {
        ...newsData,
        publishedAt: publishedAt(),
        category: { connect: { slug: categorySlug } },
      },
    });
  }
  console.log(`Seeded ${seedNews.length + extraSeedNews.length} news items`);

  const scheduledAt = nextWednesday1900Wib(new Date());
  await db.liveSession.upsert({
    where: { id: "live-weekly-market-discussion" },
    update: { scheduledAt, status: LiveSessionStatusKind.SCHEDULED },
    create: {
      id: "live-weekly-market-discussion",
      title: "Weekly Market Discussion",
      description:
        "Live discussion of the weekly market recap with time for member questions at the end of the session.",
      scheduledAt,
      platform: LiveSessionPlatformKind.ZOOM,
      joinUrl: "https://zoom.us/j/1234567890",
      status: LiveSessionStatusKind.SCHEDULED,
    },
  });
  console.log(`Seeded live session on ${scheduledAt.toISOString()}`);

  await seedStocks();
  await seedSignals();
  await seedSignalWatchlist();
  await seedMarketIndex();
  await seedNewsSections();
  await seedDiscussion();

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
