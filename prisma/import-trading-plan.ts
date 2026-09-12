import "dotenv/config";
import { db } from "../src/database";
import { SignalEventKind, SignalEventStateKind, SignalTypeKind } from "../src/database/prisma/enums";
import { initialStatus } from "../src/features/signals/signal-status";

/**
 * Publishes the trading plan derived from the 2026-09-11 close.
 *
 *   npm run import:trading-plan
 *
 * HOW THESE WERE BUILT — every number traces to data already in this database:
 *
 *   entry range   the session range the stock is actually consolidating in,
 *                 read from stock_summaries
 *   stop          under a real swing low from the last ten sessions, not a
 *                 round number
 *   target 1      the nearest real resistance in the data, or a measured move
 *                 off the base where the chart has none above
 *   target 2      the research house's OWN published target, from the reports
 *                 in the e-book library. Not a number invented here.
 *   flow          per-ticker foreign net from broker_summaries, 5d and 20d
 *
 * Judgement — which setups are worth taking, and whether to publish them at
 * all — belongs to the desk, not to this script. Re-running upserts by id.
 */
const PLAN_DATE = "2026-09-11";

interface PlanEntry {
  id: string;
  ticker: string;
  companyName: string;
  type: SignalTypeKind;
  entryLow: number;
  entryHigh: number;
  currentPrice: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: string;
  timeHorizon: string;
  thesis: string;
  keyCatalysts: string[];
}

const plan: PlanEntry[] = [
  {
    id: "signal-aadi-20260911",
    ticker: "AADI",
    companyName: "Adaro Andalan Indonesia Tbk",
    type: SignalTypeKind.SWING,
    // Consolidating after the 9 Sep breakout; 11 Sep low was 11,875.
    entryLow: 11900,
    entryHigh: 12300,
    currentPrice: 12225,
    target1: 12925, // the 10 Sep high, the only resistance above
    target2: 13500, // Mandiri Sekuritas published target, 10 Sep note
    stopLoss: 11850, // under the 11 Sep swing low
    riskReward: "1:1.4",
    timeHorizon: "3 – 8 weeks",
    thesis:
      "The strongest foreign bid on the board: net +Rp 546B over twenty sessions and +Rp 381B of that in the last five, so the buying is accelerating rather than fading. Price broke out on 9 Sep and has held the move, pulling back only to 11,875. Mandiri Sekuritas keeps AADI as its coal top pick at a Rp 13,500 target on cost structure and cash generation, with RKAB quotas now largely settled. The stop sits under the breakout pullback low: below that the move has failed and the reason to hold goes with it.",
    keyCatalysts: [
      "Foreign net +Rp 546B over 20 days, +Rp 381B in the last 5",
      "Holding the 9 Sep breakout; pullback low 11,875 intact",
      "RKAB quotas finalised, tightening exportable supply",
      "Mandiri Sekuritas top pick, target Rp 13,500",
    ],
  },
  {
    id: "signal-ptba-20260911",
    ticker: "PTBA",
    companyName: "Bukit Asam Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 3020,
    entryHigh: 3120,
    currentPrice: 3100,
    // No resistance above 3,200, so target 1 is the measured move off the
    // 2,310-2,400 base rather than a level read off the chart.
    target1: 3500,
    target2: 4000, // Mandiri Sekuritas target on the upgrade to Buy
    stopLoss: 2960, // under the 8-9 Sep lows at 2,970
    riskReward: "1:2.4",
    timeHorizon: "4 – 10 weeks",
    thesis:
      "Up from 2,560 to 3,100 in eight sessions on foreign net +Rp 385B, of which +Rp 323B arrived in the last five — the bid is chasing, not distributing. Mandiri upgraded PTBA to Buy at a Rp 4,000 target on improving cost structure and ASP. Price has spent three sessions between 3,040 and 3,140 without giving back the move, which is what continuation usually looks like. Above 3,200 there is no overhead supply in this dataset, so the first target is the measured move off the base rather than a level anyone is defending.",
    keyCatalysts: [
      "Foreign net +Rp 385B over 20 days, +Rp 323B in the last 5",
      "Three-session hold between 3,040 and 3,140 after a 21% run",
      "Mandiri upgrade to Buy, target Rp 4,000, on cost and ASP",
      "No overhead supply above the 3,200 high",
    ],
  },
  {
    id: "signal-eraa-20260911",
    ticker: "ERAA",
    companyName: "Erajaya Swasembada Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 575,
    entryHigh: 595,
    currentPrice: 595,
    target1: 660, // above the 4 Sep high at 635
    target2: 800, // UOB Kay Hian published target, 4 Sep note
    stopLoss: 555, // under the 7 Sep low at 560
    riskReward: "1:1.6",
    timeHorizon: "6 – 12 weeks",
    thesis:
      "UOB Kay Hian raised its target to Rp 800 from Rp 450 on 4 Sep, and the market marked the stock up the day the note landed — 515 to 610 in a session. It has since held that gap between 560 and 625 rather than filling it, with foreign net +Rp 203B over twenty sessions. The thesis is Erablue: 15.9% same-store sales growth in 7M26 and 102 stores added year to date, which is what takes the group beyond a smartphone business whose own SSSG is still negative at -8.6%. Above 635 there is no resistance in this dataset.",
    keyCatalysts: [
      "UOBKH target raised to Rp 800 from Rp 450, 4 Sep",
      "Gap from 515 to 610 held, not filled, for six sessions",
      "Foreign net +Rp 203B over 20 days",
      "Erablue SSSG 15.9% in 7M26, 102 stores added ytd",
    ],
  },
  {
    id: "signal-cpin-20260911",
    ticker: "CPIN",
    companyName: "Charoen Pokphand Indonesia Tbk",
    type: SignalTypeKind.POSITION,
    // Buying weakness: the entry sits below the current price on purpose.
    entryLow: 3000,
    entryHigh: 3100,
    currentPrice: 3160,
    target1: 3380, // the twenty-session high
    target2: 4400, // Trimegah published target, 31 Aug note
    stopLoss: 2940, // under the twenty-session low at 2,960
    riskReward: "1:1.8",
    timeHorizon: "3 – 6 months",
    thesis:
      "The one position here where the flow and the research disagree, and the disagreement is the point. Foreign investors have sold a net Rp 916B over twenty sessions, Rp 352B of it in the last five — by far the heaviest distribution on this list. Trimegah's 31 Aug note argues that selling is the MSCI standard-index exclusion rather than a view on the business, puts the remaining index position at US$97m, and calls the post-rebalancing window the entry. 1H26 earnings beat at 59-60% of full-year estimates and the stock trades at 7x, 1.5SD below its five-year average. Entry is set below the current price deliberately: this is a bid into weakness, not a chase, and it is only valid while the selling stays mechanical. If foreign outflow continues past the rebalancing date the premise is wrong.",
    keyCatalysts: [
      "Foreign net -Rp 916B over 20 days — read as MSCI exclusion flow",
      "Trimegah: remaining standard index position US$97m, target Rp 4,400",
      "1H26 earnings at 59-60% of full-year consensus",
      "7x P/E, 1.5SD below the five-year average",
    ],
  },
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

async function main(): Promise<void> {
  const issuedAt = new Date(`${PLAN_DATE}T16:15:00+07:00`); // after the close

  for (const entry of plan) {
    const stock = await db.stock.findFirst({ where: { ticker: entry.ticker } });
    if (!stock) {
      console.error(`${entry.ticker} is not in the stock list — skipping.`);
      continue;
    }

    const levels = { target1: entry.target1, target2: entry.target2, stopLoss: entry.stopLoss };
    // Derived by the same rule the app uses, never asserted here.
    const status = initialStatus(entry.currentPrice, levels);

    const data = {
      ticker: entry.ticker,
      companyName: stock.name,
      type: entry.type,
      entryLow: entry.entryLow,
      entryHigh: entry.entryHigh,
      currentPrice: entry.currentPrice,
      target1: entry.target1,
      target2: entry.target2,
      stopLoss: entry.stopLoss,
      status,
      riskReward: entry.riskReward,
      timeHorizon: entry.timeHorizon,
      thesis: entry.thesis,
      chartImages: [],
      keyCatalysts: entry.keyCatalysts,
      issuedAt,
      closedAt: null,
    };

    await db.signal.upsert({
      where: { id: entry.id },
      update: data,
      create: { id: entry.id, ...data },
    });

    await db.signalEvent.deleteMany({ where: { signalId: entry.id } });
    await db.signalEvent.createMany({
      data: [
        {
          signalId: entry.id,
          kind: SignalEventKind.ENTRY,
          state: SignalEventStateKind.DONE,
          title: "Signal issued",
          detail: `${entry.ticker} at ${formatPrice(entry.entryLow)} – ${formatPrice(entry.entryHigh)}`,
          occurredAt: issuedAt,
          sortOrder: 0,
        },
        {
          signalId: entry.id,
          kind: SignalEventKind.TARGET,
          state: SignalEventStateKind.PENDING,
          title: "Target 1",
          detail: `${formatPrice(entry.target1)} (pending)`,
          occurredAt: null,
          sortOrder: 1,
        },
        {
          signalId: entry.id,
          kind: SignalEventKind.TARGET,
          state: SignalEventStateKind.PENDING,
          title: "Target 2",
          detail: `${formatPrice(entry.target2)} (pending)`,
          occurredAt: null,
          sortOrder: 2,
        },
        {
          signalId: entry.id,
          kind: SignalEventKind.STOP_LOSS,
          state: SignalEventStateKind.ACTIVE,
          title: "Stop Loss",
          detail: formatPrice(entry.stopLoss),
          occurredAt: null,
          sortOrder: 3,
        },
      ],
    });

    const risk = entry.entryHigh - entry.stopLoss;
    const reward = entry.target1 - entry.entryHigh;
    console.log(
      `  ${entry.ticker.padEnd(5)} ${status.padEnd(7)} entry ${formatPrice(entry.entryLow)}-${formatPrice(entry.entryHigh)} ` +
        `| T1 ${formatPrice(entry.target1)} T2 ${formatPrice(entry.target2)} | stop ${formatPrice(entry.stopLoss)} ` +
        `| R:R ${entry.riskReward} (${reward}/${risk})`,
    );
  }

  console.log(`\nPublished ${plan.length} plans from the ${PLAN_DATE} close.`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
