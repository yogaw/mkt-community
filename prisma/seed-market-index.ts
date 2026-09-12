import { db } from "../src/database";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** IHSG closes at 16:15 WIB (09:15 UTC). */
function closeAt(daysAgo: number): Date {
  const date = new Date(Date.now() - daysAgo * DAY_IN_MS);
  date.setUTCHours(9, 15, 0, 0);
  return date;
}

/** A short run of closes so the home page has a current one and some history. */
const snapshots = [
  { id: "idx-ihsg-3", daysAgo: 3, value: 7768.4, changePercent: -0.41, turnoverIdr: 7_900_000_000_000, foreignFlowIdr: -180_000_000_000, advancers: 241, decliners: 298 },
  { id: "idx-ihsg-2", daysAgo: 2, value: 7799.12, changePercent: 0.4, turnoverIdr: 8_100_000_000_000, foreignFlowIdr: 210_000_000_000, advancers: 289, decliners: 243 },
  { id: "idx-ihsg-1", daysAgo: 1, value: 7789.18, changePercent: -0.13, turnoverIdr: 7_600_000_000_000, foreignFlowIdr: -95_000_000_000, advancers: 258, decliners: 276 },
  { id: "idx-ihsg-0", daysAgo: 0, value: 7845.21, changePercent: 0.72, turnoverIdr: 8_400_000_000_000, foreignFlowIdr: 640_000_000_000, advancers: 312, decliners: 221 },
];

export async function seedMarketIndex(): Promise<void> {
  for (const snapshot of snapshots) {
    const { daysAgo, ...data } = snapshot;
    const capturedAt = closeAt(daysAgo);
    await db.marketIndexSnapshot.upsert({
      where: { id: snapshot.id },
      update: { ...data, indexName: "IHSG", capturedAt },
      create: { ...data, indexName: "IHSG", capturedAt },
    });
  }
  console.log(`Seeded ${snapshots.length} index snapshots (latest is today's close)`);
}
