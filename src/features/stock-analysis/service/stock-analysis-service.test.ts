import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { StockAnalysisServiceImpl } from "./stock-analysis-service";
import type { BrokerAnalysisRepository, BrokerDayRow } from "../repository/broker-analysis-repository";
import type { StockProfileRepository } from "../repository/stock-profile-repository";
import type { FundamentalsRepository } from "../repository/fundamentals-repository";
import type { BrokerSummaryQuery } from "../stock-analysis-types";

/** Lots and rupiah, written out so the arithmetic in the test is checkable. */
function row(broker: string, date: string, buyValue: number, sellValue: number, buyLots = 0, sellLots = 0): BrokerDayRow {
  return {
    broker,
    date,
    buyValue: String(buyValue),
    sellValue: String(sellValue),
    buyLots: String(buyLots),
    sellLots: String(sellLots),
  };
}

function brokerRepo(rows: BrokerDayRow[], closes: Array<{ date: string; close: number }> = []): BrokerAnalysisRepository {
  return {
    findBrokerDays: async () => rows,
    findDailyCloses: async () => closes,
    findLatestIngestAt: async () => "2026-09-11T12:00:00.000Z",
    findCoverage: async () => ({ earliest: "2026-06-02", latest: "2026-09-11" }),
  };
}

const stockRepo = {
  findName: async () => "Test Tbk",
  findLatestSummary: async () => null,
  findYearRange: async () => null,
  findRecentCloses: async () => [],
  search: async () => [],
  findMostActive: async () => [],
  findSignalForTicker: async () => null,
  findDiscussionsForTicker: async () => [],
} as unknown as StockProfileRepository;

const noFundamentals: FundamentalsRepository = { find: async () => null };

const QUERY: BrokerSummaryQuery = {
  startDate: "2026-09-01",
  endDate: "2026-09-03",
  topBrokers: 8,
  market: "ALL",
};

function service(rows: BrokerDayRow[], closes?: Array<{ date: string; close: number }>) {
  return new StockAnalysisServiceImpl(brokerRepo(rows, closes), stockRepo, noFundamentals);
}

describe("broker summary totals", () => {
  it("sums buy, sell, net and lots across brokers and days", async () => {
    const summary = await service([
      row("AA", "2026-09-01", 100, 40, 10, 4),
      row("AA", "2026-09-02", 60, 90, 6, 9),
      row("BB", "2026-09-01", 20, 50, 2, 5),
    ]).getBrokerSummary("TEST", QUERY);

    assert.equal(summary.totalBuyValue, 180);
    assert.equal(summary.totalSellValue, 180);
    assert.equal(summary.netValue, 0);
    assert.equal(summary.totalBuyLots, 18);
    assert.equal(summary.totalSellLots, 18);
    assert.equal(summary.netLots, 0);
    // Buy plus sell, because it is the denominator the threshold scales against.
    assert.equal(summary.totalTradedValue, 360);
    assert.equal(summary.tradingDays, 2);
  });

  it("keeps broker nets summing to the market net", async () => {
    const summary = await service([
      row("AA", "2026-09-01", 500, 100),
      row("BB", "2026-09-01", 100, 700),
      row("CC", "2026-09-02", 300, 50),
    ]).getBrokerSummary("TEST", QUERY);

    const fromBrokers = summary.brokers.reduce((total, broker) => total + broker.netValue, 0);
    const fromDays = summary.daily.reduce((total, day) => total + day.netValue, 0);
    assert.equal(fromBrokers, summary.netValue);
    assert.equal(fromDays, summary.netValue);
  });
});

describe("cumulative series", () => {
  it("runs forward per broker and ends at that broker's total net", async () => {
    const summary = await service([
      row("AA", "2026-09-01", 100, 0),
      row("AA", "2026-09-02", 0, 30),
      row("AA", "2026-09-03", 50, 0),
    ]).getBrokerSummary("TEST", QUERY);

    const aa = summary.brokers.find((broker) => broker.brokerCode === "AA")!;
    assert.deepEqual(aa.daily.map((day) => day.netValue), [100, -30, 50]);
    assert.deepEqual(aa.daily.map((day) => day.cumulativeNetValue), [100, 70, 120]);
    assert.equal(aa.daily.at(-1)!.cumulativeNetValue, aa.netValue);
  });

  it("orders days ascending whatever order the rows arrive in", async () => {
    const summary = await service([
      row("AA", "2026-09-03", 50, 0),
      row("AA", "2026-09-01", 100, 0),
      row("AA", "2026-09-02", 0, 30),
    ]).getBrokerSummary("TEST", QUERY);

    const aa = summary.brokers[0];
    assert.deepEqual(aa.daily.map((day) => day.date), ["2026-09-01", "2026-09-02", "2026-09-03"]);
    assert.deepEqual(aa.daily.map((day) => day.cumulativeNetValue), [100, 70, 120]);
  });
});

describe("ranking and shares", () => {
  it("sorts brokers by net value descending and names both extremes", async () => {
    const summary = await service([
      row("MID", "2026-09-01", 100, 100),
      row("TOP", "2026-09-01", 900, 100),
      row("LOW", "2026-09-01", 100, 900),
    ]).getBrokerSummary("TEST", QUERY);

    assert.deepEqual(summary.brokers.map((broker) => broker.brokerCode), ["TOP", "MID", "LOW"]);
    assert.equal(summary.dominantBuyer?.brokerCode, "TOP");
    assert.equal(summary.dominantSeller?.brokerCode, "LOW");
  });

  it("computes each broker's share of the period's buy and sell value", async () => {
    const summary = await service([
      row("AA", "2026-09-01", 750, 250),
      row("BB", "2026-09-01", 250, 750),
    ]).getBrokerSummary("TEST", QUERY);

    const aa = summary.brokers.find((broker) => broker.brokerCode === "AA")!;
    assert.equal(aa.buySharePercent, 75);
    assert.equal(aa.sellSharePercent, 25);
  });

  it("computes the average price from shares, not lots", async () => {
    // 1,000 lots = 100,000 shares; Rp 500,000,000 / 100,000 = Rp 5,000.
    const summary = await service([row("AA", "2026-09-01", 500_000_000, 0, 1_000, 0)]).getBrokerSummary(
      "TEST",
      QUERY,
    );
    assert.equal(summary.brokers[0].avgBuyPrice, 5_000);
    assert.equal(summary.brokers[0].avgSellPrice, null, "a side that never traded has no price");
  });
});

describe("chart selection", () => {
  const many = Array.from({ length: 20 }, (_, index) =>
    row(`B${index}`, "2026-09-01", (20 - index) * 100, index * 100),
  );

  it("draws the biggest movers on both sides, not just the top buyers", async () => {
    const summary = await service(many).getBrokerSummary("TEST", { ...QUERY, topBrokers: 6 });

    assert.equal(summary.chartBrokers.length, 6);
    const picked = summary.brokers.filter((broker) => summary.chartBrokers.includes(broker.brokerCode));
    assert.ok(picked.some((broker) => broker.netValue > 0), "a net buyer is drawn");
    assert.ok(picked.some((broker) => broker.netValue < 0), "a net seller is drawn too");
  });

  it("draws everything when the control is set to All, and never limits the table", async () => {
    const summary = await service(many).getBrokerSummary("TEST", { ...QUERY, topBrokers: 0 });
    assert.equal(summary.chartBrokers.length, 20);
    assert.equal(summary.brokers.length, 20, "the table always carries every broker");
  });
});

describe("daily market flow", () => {
  it("combines brokers per day and attaches the close when price history covers it", async () => {
    const summary = await service(
      [
        row("AA", "2026-09-01", 100, 0),
        row("BB", "2026-09-01", 0, 40),
        row("AA", "2026-09-02", 0, 10),
      ],
      [{ date: "2026-09-01", close: 1_200 }],
    ).getBrokerSummary("TEST", QUERY);

    assert.deepEqual(summary.daily.map((day) => day.netValue), [60, -10]);
    assert.equal(summary.daily[0].close, 1_200);
    // A day with no close is null, not zero — the panel skips it rather than
    // drawing a price of nothing.
    assert.equal(summary.daily[1].close, null);
  });
});

describe("an empty period", () => {
  it("returns zeroes and says nothing traded, rather than failing", async () => {
    const summary = await service([]).getBrokerSummary("TEST", QUERY);

    assert.equal(summary.brokers.length, 0);
    assert.equal(summary.daily.length, 0);
    assert.equal(summary.netValue, 0);
    assert.equal(summary.flowState, "BALANCED");
    assert.equal(summary.dominantBuyer, null);
    assert.match(summary.insight, /No broker transactions were recorded/);
    assert.deepEqual(summary.concentration, { top1Percent: 0, top3Percent: 0, top5Percent: 0 });
  });
});

const env = process.env as Record<string, string | undefined>;

async function withNodeEnv<T>(value: string, run: () => Promise<T>): Promise<T> {
  const original = env.NODE_ENV;
  env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    env.NODE_ENV = original;
  }
}

describe("sample fundamentals in production", () => {
  it("is withheld, because a fabricated figure on a real company is worse than none", async () => {
    const withSample = new StockAnalysisServiceImpl(brokerRepo([]), stockRepo, {
      find: async () => ({ ticker: "TEST", provenance: "SAMPLE" }) as never,
    });

    assert.notEqual(
      await withNodeEnv("development", () => withSample.getFundamentals("TEST", "TTM")),
      null,
    );
    assert.equal(
      await withNodeEnv("production", () => withSample.getFundamentals("TEST", "TTM")),
      null,
    );
  });

  it("passes reported data straight through in production", async () => {
    const withReported = new StockAnalysisServiceImpl(brokerRepo([]), stockRepo, {
      find: async () => ({ ticker: "TEST", provenance: "REPORTED" }) as never,
    });

    assert.notEqual(
      await withNodeEnv("production", () => withReported.getFundamentals("TEST", "TTM")),
      null,
    );
  });
});
