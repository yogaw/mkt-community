import { db } from "../src/database";
import {
  SignalEventKind,
  SignalEventStateKind,
  SignalStatusKind,
  SignalTypeKind,
} from "../src/database/prisma/enums";
import { advanceStatus } from "../src/features/signals/signal-status";
import type { SignalStatus } from "../src/features/signals/signal-types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Dates are relative to run time so the page never looks stale, matching the rest of the seed. */
function daysAgo(days: number, hour = 9, minute = 0): Date {
  const date = new Date(Date.now() - days * DAY_IN_MS);
  // 09:20 WIB is 02:20 UTC (UTC+7, no daylight saving).
  date.setUTCHours(hour - 7, minute, 0, 0);
  return date;
}

interface SeedUpdate {
  title: string;
  detail: string;
  daysAgo: number;
  hour: number;
  minute: number;
}

interface SeedSignal {
  ticker: string;
  companyName: string;
  type: SignalTypeKind;
  entryLow: number;
  entryHigh: number;
  target1: number;
  target2: number;
  stopLoss: number;
  /** Daily closes since entry, oldest first. Status is folded from these, and
   *  the last one is the current price. */
  closes: number[];
  riskReward: string;
  timeHorizon: string;
  thesis: string;
  keyCatalysts: string[];
  issuedDaysAgo: number;
  issuedHour: number;
  issuedMinute: number;
  updates?: SeedUpdate[];
  /** When a milestone was reached, so the weekly stat cards can count it. */
  tp1HitDaysAgo?: number;
  tp2HitDaysAgo?: number;
  stopHitDaysAgo?: number;
}

const activeSignals: SeedSignal[] = [
  {
    ticker: "CUAN",
    companyName: "Petrindo Jaya Kreasi Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 1500,
    entryHigh: 1550,
    closes: [1600, 1650],
    target1: 1700,
    target2: 1850,
    stopLoss: 1420,
    riskReward: "1:1.2",
    timeHorizon: "1 – 4 weeks",
    thesis:
      "CUAN is showing a strong breakout above previous resistance with high volume, indicating continued bullish momentum. The company is also benefiting from improving coal prices and positive sector sentiment. We expect a move towards 1,700 in the short term, with potential extension to 1,850 if volume remains strong.",
    keyCatalysts: [
      "Breakout above major resistance level at 1,550",
      "Increasing trading volume",
      "Stronger coal prices and positive sector sentiment",
      "Potential re-rating from improved earnings outlook",
    ],
    issuedDaysAgo: 5,
    issuedHour: 9,
    issuedMinute: 20,
    updates: [
      { title: "Price update", detail: "Hit 1,600 (+6.5%)", daysAgo: 4, hour: 10, minute: 15 },
      {
        title: "Analysis update",
        detail: "Volume continues to stay strong. Maintaining targets.",
        daysAgo: 3,
        hour: 14,
        minute: 32,
      },
    ],
  },
  {
    ticker: "PTRO",
    companyName: "Petrosea Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 3400,
    entryHigh: 3500,
    closes: [3900, 3750],
    target1: 3900,
    target2: 4200,
    stopLoss: 3250,
    riskReward: "1:1.6",
    timeHorizon: "2 – 6 weeks",
    thesis:
      "PTRO continues to win contract extensions in the mining services segment, and the order book gives good visibility into next year's revenue. The chart has held its rising trendline on every pullback since the breakout, and the first target has now been reached.",
    keyCatalysts: [
      "New contract wins lifting the order book",
      "Rising trendline intact on every pullback",
      "First target reached, remainder trailing to 4,200",
    ],
    issuedDaysAgo: 7,
    issuedHour: 9,
    issuedMinute: 5,
    updates: [
      { title: "Target 1 reached", detail: "Hit 3,900. Took partial profit.", daysAgo: 2, hour: 11, minute: 40 },
    ],
    tp1HitDaysAgo: 2,
  },
  {
    ticker: "RAJA",
    companyName: "Rukun Raharja Tbk",
    type: SignalTypeKind.TRADING,
    entryLow: 2100,
    entryHigh: 2150,
    closes: [2200, 1980, 1990],
    target1: 2350,
    target2: 2600,
    stopLoss: 1980,
    riskReward: "1:1.2",
    timeHorizon: "3 – 10 days",
    thesis:
      "A short-term momentum setup on the back of the gas distribution expansion story. The trade lost its footing when broad energy sentiment turned and the level we were leaning on gave way, so the stop was respected as planned.",
    keyCatalysts: [
      "Gas distribution expansion narrative",
      "Momentum setup off the 2,100 support shelf",
      "Stop respected at 1,980 when support broke",
    ],
    issuedDaysAgo: 10,
    issuedHour: 9,
    issuedMinute: 12,
    updates: [
      { title: "Stop loss hit", detail: "Exited at 1,980. Support gave way on higher volume.", daysAgo: 6, hour: 15, minute: 5 },
    ],
    stopHitDaysAgo: 6,
  },
  {
    ticker: "BULL",
    companyName: "Buana Lintas Lautan Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 720,
    entryHigh: 750,
    closes: [820, 900, 785],
    target1: 820,
    target2: 900,
    stopLoss: 680,
    riskReward: "1:1",
    timeHorizon: "2 – 5 weeks",
    thesis:
      "Tanker rates stayed elevated for longer than the market expected, and BULL's fleet utilisation followed. Both targets were reached on the rate spike; the position has since been closed out with the remainder trailing back toward the entry zone.",
    keyCatalysts: [
      "Elevated tanker rates holding through the quarter",
      "Fleet utilisation improving",
      "Both targets reached on the rate spike",
    ],
    issuedDaysAgo: 12,
    issuedHour: 9,
    issuedMinute: 30,
    updates: [
      { title: "Target 1 reached", detail: "Hit 820 (+13.9%)", daysAgo: 8, hour: 10, minute: 20 },
      { title: "Target 2 reached", detail: "Hit 900 (+25.0%). Position closed.", daysAgo: 5, hour: 13, minute: 45 },
    ],
    tp1HitDaysAgo: 8,
    tp2HitDaysAgo: 5,
  },
  {
    ticker: "INET",
    companyName: "Sinergi Inti Andalan Prima Tbk",
    type: SignalTypeKind.POSITION,
    entryLow: 6200,
    entryHigh: 6400,
    closes: [6150],
    target1: 7500,
    target2: 8000,
    stopLoss: 5800,
    riskReward: "1:1.8",
    timeHorizon: "3 – 9 months",
    thesis:
      "A longer-horizon position on data centre and connectivity build-out. The thesis plays out over quarters rather than weeks, so the small drawdown since entry is well inside the expected range and the stop sits far enough below to let it work.",
    keyCatalysts: [
      "Data centre and connectivity capacity build-out",
      "Recurring revenue mix improving each quarter",
      "Re-rating expected as utilisation climbs",
    ],
    issuedDaysAgo: 14,
    issuedHour: 9,
    issuedMinute: 0,
  },
  {
    ticker: "AMMN",
    companyName: "Amman Mineral Internasional Tbk",
    type: SignalTypeKind.SWING,
    entryLow: 9800,
    entryHigh: 10000,
    closes: [10400, 10450],
    target1: 11000,
    target2: 12000,
    stopLoss: 9200,
    riskReward: "1:1.3",
    timeHorizon: "3 – 8 weeks",
    thesis:
      "Copper prices firming into a tight supply backdrop, with the smelter ramp adding volume just as the price cycle turns. The stock has been building a base above the entry zone and is now pressing the upper end of that range.",
    keyCatalysts: [
      "Copper price strength on tight global supply",
      "Smelter ramp adding processed volume",
      "Base built above the 9,800 entry shelf",
    ],
    issuedDaysAgo: 17,
    issuedHour: 9,
    issuedMinute: 45,
    updates: [
      { title: "Price update", detail: "Reclaimed 10,400 on strong volume.", daysAgo: 4, hour: 9, minute: 55 },
    ],
  },
  {
    ticker: "TLKM",
    companyName: "Telkom Indonesia (Persero) Tbk",
    type: SignalTypeKind.POSITION,
    entryLow: 2850,
    entryHigh: 2950,
    closes: [2920],
    target1: 3200,
    target2: 3600,
    stopLoss: 2650,
    riskReward: "1:0.8",
    timeHorizon: "6 – 12 months",
    thesis:
      "A core defensive holding bought near the bottom of its multi-year valuation range. The dividend covers the wait, data monetisation is slowly improving margins, and the downside case is well protected at these levels.",
    keyCatalysts: [
      "Valuation near the low end of its multi-year range",
      "Dividend yield supports the holding period",
      "Data monetisation lifting margins gradually",
    ],
    issuedDaysAgo: 20,
    issuedHour: 9,
    issuedMinute: 15,
  },
];

interface SeedClosedSignal {
  ticker: string;
  companyName: string;
  type: SignalTypeKind;
  entryLow: number;
  entryHigh: number;
  exitPrice: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: string;
  timeHorizon: string;
  thesis: string;
  issuedDaysAgo: number;
  closedDaysAgo: number;
}

/** Nine winners and three losers, so the performance tab is computed from real rows. */
const closedSignals: SeedClosedSignal[] = [
  { ticker: "ANTM", companyName: "Aneka Tambang Tbk", type: SignalTypeKind.SWING, entryLow: 1400, entryHigh: 1450, exitPrice: 1610, target1: 1600, target2: 1750, stopLoss: 1300, riskReward: "1:1.3", timeHorizon: "2 – 5 weeks", thesis: "Gold strength and domestic downstream policy support lifted ANTM through the 1,600 target.", issuedDaysAgo: 28, closedDaysAgo: 22 },
  { ticker: "MDKA", companyName: "Merdeka Copper Gold Tbk", type: SignalTypeKind.SWING, entryLow: 2300, entryHigh: 2400, exitPrice: 2610, target1: 2600, target2: 2900, stopLoss: 2150, riskReward: "1:0.8", timeHorizon: "3 – 6 weeks", thesis: "Copper and gold exposure with the AIM ramp progressing ahead of schedule.", issuedDaysAgo: 32, closedDaysAgo: 25 },
  { ticker: "BBRI", companyName: "Bank Rakyat Indonesia (Persero) Tbk", type: SignalTypeKind.POSITION, entryLow: 4500, entryHigh: 4650, exitPrice: 5010, target1: 5000, target2: 5400, stopLoss: 4200, riskReward: "1:1.2", timeHorizon: "3 – 6 months", thesis: "Micro lending growth recovered and credit costs normalised faster than guided.", issuedDaysAgo: 36, closedDaysAgo: 27 },
  { ticker: "INCO", companyName: "Vale Indonesia Tbk", type: SignalTypeKind.TRADING, entryLow: 3900, entryHigh: 4000, exitPrice: 3660, target1: 4300, target2: 4600, stopLoss: 3650, riskReward: "1:0.9", timeHorizon: "1 – 3 weeks", thesis: "Nickel bounce trade that failed when LME inventories kept building. Stop respected.", issuedDaysAgo: 40, closedDaysAgo: 34 },
  { ticker: "ADRO", companyName: "Alamtri Resources Indonesia Tbk", type: SignalTypeKind.SWING, entryLow: 2600, entryHigh: 2700, exitPrice: 2990, target1: 2950, target2: 3200, stopLoss: 2450, riskReward: "1:1", timeHorizon: "2 – 6 weeks", thesis: "Coal price stabilised above expectations and the dividend announcement drew buyers back.", issuedDaysAgo: 44, closedDaysAgo: 36 },
  { ticker: "ASII", companyName: "Astra International Tbk", type: SignalTypeKind.POSITION, entryLow: 4900, entryHigh: 5050, exitPrice: 5340, target1: 5300, target2: 5700, stopLoss: 4600, riskReward: "1:0.6", timeHorizon: "3 – 6 months", thesis: "Four-wheel volumes bottomed and the heavy equipment arm carried earnings through the cycle.", issuedDaysAgo: 48, closedDaysAgo: 39 },
  { ticker: "BRPT", companyName: "Barito Pacific Tbk", type: SignalTypeKind.TRADING, entryLow: 1050, entryHigh: 1100, exitPrice: 980, target1: 1200, target2: 1320, stopLoss: 975, riskReward: "1:0.8", timeHorizon: "1 – 3 weeks", thesis: "Petrochemical spread trade that never got going; the 1,050 shelf broke and the stop did its job.", issuedDaysAgo: 52, closedDaysAgo: 47 },
  { ticker: "BMRI", companyName: "Bank Mandiri (Persero) Tbk", type: SignalTypeKind.POSITION, entryLow: 6000, entryHigh: 6200, exitPrice: 6620, target1: 6600, target2: 7100, stopLoss: 5600, riskReward: "1:0.7", timeHorizon: "3 – 6 months", thesis: "Corporate loan growth and a stable margin outlook carried the stock to the first target.", issuedDaysAgo: 56, closedDaysAgo: 45 },
  { ticker: "PGAS", companyName: "Perusahaan Gas Negara Tbk", type: SignalTypeKind.SWING, entryLow: 1500, entryHigh: 1560, exitPrice: 1680, target1: 1670, target2: 1800, stopLoss: 1400, riskReward: "1:0.7", timeHorizon: "2 – 5 weeks", thesis: "Distribution volumes recovered and the regulated margin held, closing the valuation gap.", issuedDaysAgo: 60, closedDaysAgo: 52 },
  { ticker: "ITMG", companyName: "Indo Tambangraya Megah Tbk", type: SignalTypeKind.SWING, entryLow: 25000, entryHigh: 25800, exitPrice: 27500, target1: 27400, target2: 29000, stopLoss: 23500, riskReward: "1:0.7", timeHorizon: "3 – 8 weeks", thesis: "Seasonal coal demand plus a strong cash position ahead of the dividend cycle.", issuedDaysAgo: 64, closedDaysAgo: 55 },
  { ticker: "SMGR", companyName: "Semen Indonesia (Persero) Tbk", type: SignalTypeKind.TRADING, entryLow: 3700, entryHigh: 3800, exitPrice: 3480, target1: 4100, target2: 4400, stopLoss: 3470, riskReward: "1:0.9", timeHorizon: "1 – 4 weeks", thesis: "Bet on a construction volume recovery that did not arrive; exited at the stop.", issuedDaysAgo: 68, closedDaysAgo: 61 },
  { ticker: "UNTR", companyName: "United Tractors Tbk", type: SignalTypeKind.POSITION, entryLow: 24000, entryHigh: 24800, exitPrice: 26900, target1: 26800, target2: 28500, stopLoss: 22500, riskReward: "1:0.9", timeHorizon: "3 – 6 months", thesis: "Heavy equipment sales held up and the gold segment added a second earnings engine.", issuedDaysAgo: 72, closedDaysAgo: 63 },
];

function signalId(ticker: string): string {
  return `signal-${ticker.toLowerCase()}`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Runs the seeded close history through the same rule the app uses, so the
 * seeded statuses are produced by the production logic rather than asserted.
 */
function derivedStatus(signal: SeedSignal): SignalStatus {
  const levels = {
    target1: signal.target1,
    target2: signal.target2,
    stopLoss: signal.stopLoss,
  };
  return signal.closes.reduce<SignalStatus>(
    (status, close) => advanceStatus(status, close, levels),
    SignalStatusKind.ACTIVE,
  );
}

function currentPriceOf(signal: SeedSignal): number {
  return signal.closes[signal.closes.length - 1];
}

/** Timeline rows: entry, any updates, then the two targets and the stop. */
function buildEvents(signal: SeedSignal) {
  const status = derivedStatus(signal);
  const reachedTp1 = status === SignalStatusKind.TP1_HIT || status === SignalStatusKind.TP2_HIT;
  const reachedTp2 = status === SignalStatusKind.TP2_HIT;
  const stopped = status === SignalStatusKind.STOP_LOSS;

  const events = [
    {
      kind: SignalEventKind.ENTRY,
      state: SignalEventStateKind.DONE,
      title: "Signal issued",
      detail: `${signal.ticker} at ${formatPrice(signal.entryLow)} – ${formatPrice(signal.entryHigh)}`,
      occurredAt: daysAgo(signal.issuedDaysAgo, signal.issuedHour, signal.issuedMinute),
    },
    ...(signal.updates ?? []).map((update) => ({
      kind: SignalEventKind.UPDATE,
      state: SignalEventStateKind.DONE,
      title: update.title,
      detail: update.detail,
      occurredAt: daysAgo(update.daysAgo, update.hour, update.minute),
    })),
    {
      kind: SignalEventKind.TARGET,
      state: reachedTp1 ? SignalEventStateKind.DONE : SignalEventStateKind.PENDING,
      title: "Target 1",
      detail: reachedTp1 ? formatPrice(signal.target1) : `${formatPrice(signal.target1)} (pending)`,
      occurredAt: signal.tp1HitDaysAgo === undefined ? null : daysAgo(signal.tp1HitDaysAgo),
    },
    {
      kind: SignalEventKind.TARGET,
      state: reachedTp2 ? SignalEventStateKind.DONE : SignalEventStateKind.PENDING,
      title: "Target 2",
      detail: reachedTp2 ? formatPrice(signal.target2) : `${formatPrice(signal.target2)} (pending)`,
      occurredAt: signal.tp2HitDaysAgo === undefined ? null : daysAgo(signal.tp2HitDaysAgo),
    },
    {
      kind: SignalEventKind.STOP_LOSS,
      state: stopped ? SignalEventStateKind.DONE : SignalEventStateKind.ACTIVE,
      title: "Stop Loss",
      detail: formatPrice(signal.stopLoss),
      occurredAt: signal.stopHitDaysAgo === undefined ? null : daysAgo(signal.stopHitDaysAgo),
    },
  ];

  return events.map((event, index) => ({ ...event, sortOrder: index }));
}

export async function seedSignals(): Promise<void> {
  for (const signal of activeSignals) {
    const id = signalId(signal.ticker);
    const issuedAt = daysAgo(signal.issuedDaysAgo, signal.issuedHour, signal.issuedMinute);
    const data = {
      ticker: signal.ticker,
      companyName: signal.companyName,
      type: signal.type,
      entryLow: signal.entryLow,
      entryHigh: signal.entryHigh,
      currentPrice: currentPriceOf(signal),
      target1: signal.target1,
      target2: signal.target2,
      stopLoss: signal.stopLoss,
      status: derivedStatus(signal),
      riskReward: signal.riskReward,
      timeHorizon: signal.timeHorizon,
      thesis: signal.thesis,
      chartImages: [],
      keyCatalysts: signal.keyCatalysts,
      issuedAt,
      closedAt: null,
    };

    await db.signal.upsert({ where: { id }, update: data, create: { id, ...data } });

    // Rebuilt each run so the timeline always matches the seeded status.
    await db.signalEvent.deleteMany({ where: { signalId: id } });
    await db.signalEvent.createMany({
      data: buildEvents(signal).map((event) => ({ ...event, signalId: id })),
    });
  }

  for (const signal of closedSignals) {
    const id = signalId(signal.ticker);
    const issuedAt = daysAgo(signal.issuedDaysAgo);
    const closedAt = daysAgo(signal.closedDaysAgo);
    const isWin = signal.exitPrice >= signal.entryLow;
    const data = {
      ticker: signal.ticker,
      companyName: signal.companyName,
      type: signal.type,
      entryLow: signal.entryLow,
      entryHigh: signal.entryHigh,
      currentPrice: signal.exitPrice,
      target1: signal.target1,
      target2: signal.target2,
      stopLoss: signal.stopLoss,
      status: SignalStatusKind.CLOSED,
      riskReward: signal.riskReward,
      timeHorizon: signal.timeHorizon,
      thesis: signal.thesis,
      chartImages: [],
      keyCatalysts: [],
      issuedAt,
      closedAt,
    };

    await db.signal.upsert({ where: { id }, update: data, create: { id, ...data } });

    await db.signalEvent.deleteMany({ where: { signalId: id } });
    await db.signalEvent.createMany({
      data: [
        {
          signalId: id,
          kind: SignalEventKind.ENTRY,
          state: SignalEventStateKind.DONE,
          title: "Signal issued",
          detail: `${signal.ticker} at ${formatPrice(signal.entryLow)} – ${formatPrice(signal.entryHigh)}`,
          occurredAt: issuedAt,
          sortOrder: 0,
        },
        {
          signalId: id,
          kind: isWin ? SignalEventKind.TARGET : SignalEventKind.STOP_LOSS,
          state: SignalEventStateKind.DONE,
          title: isWin ? "Position closed at target" : "Position closed at stop",
          detail: `Exited at ${formatPrice(signal.exitPrice)}`,
          occurredAt: closedAt,
          sortOrder: 1,
        },
      ],
    });
  }

  console.log(`Seeded ${activeSignals.length} active signals and ${closedSignals.length} closed signals`);
}

/** Gives the demo accounts a populated watchlist tab. */
export async function seedSignalWatchlist(): Promise<void> {
  const watchlistByEmail: Record<string, string[]> = {
    "yoga@email.com": ["CUAN", "PTRO", "AMMN", "TLKM", "INET", "ANTM", "BBRI"],
    "admin@marketinsight.id": ["CUAN", "BULL", "MDKA", "UNTR"],
  };

  let total = 0;
  for (const [email, tickers] of Object.entries(watchlistByEmail)) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      continue;
    }
    for (const ticker of tickers) {
      const id = signalId(ticker);
      await db.signalWatchlistItem.upsert({
        where: { userId_signalId: { userId: user.id, signalId: id } },
        update: {},
        create: { userId: user.id, signalId: id },
      });
      total += 1;
    }
  }
  console.log(`Seeded ${total} watchlist items`);
}
