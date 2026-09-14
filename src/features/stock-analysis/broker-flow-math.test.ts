import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  averagePrice,
  buildInsight,
  concentrationOf,
  flowBiasLabel,
  flowStateOf,
  netFlowRatio,
  priceFlowState,
  sharePercent,
  withCumulative,
  FLOW_THRESHOLDS,
} from "./broker-flow-math";
import type { BrokerFlow } from "./stock-analysis-types";

function day(date: string, netValue: number, netLots = 0) {
  return { date, buyValue: 0, sellValue: 0, netValue, buyLots: 0, sellLots: 0, netLots };
}

describe("cumulative net flow", () => {
  it("accumulates forward rather than repeating the daily figure", () => {
    const rows = withCumulative([day("2026-09-01", 100), day("2026-09-02", -30), day("2026-09-03", 50)]);
    assert.deepEqual(rows.map((r) => r.cumulativeNetValue), [100, 70, 120]);
    // The daily column must survive untouched beside it.
    assert.deepEqual(rows.map((r) => r.netValue), [100, -30, 50]);
  });

  it("accumulates lots on the same schedule", () => {
    const rows = withCumulative([day("2026-09-01", 0, 5), day("2026-09-02", 0, -2)]);
    assert.deepEqual(rows.map((r) => r.cumulativeNetLots), [5, 3]);
  });

  it("ends at the sum of every day", () => {
    const values = [12, -7, 3, 9, -20, 4];
    const rows = withCumulative(values.map((v, i) => day(`2026-09-0${i + 1}`, v)));
    assert.equal(rows.at(-1)!.cumulativeNetValue, values.reduce((a, b) => a + b, 0));
  });

  it("handles an empty period without inventing a point", () => {
    assert.deepEqual(withCumulative([]), []);
  });
});

describe("flow state", () => {
  const turnover = 1_000_000_000;

  it("is balanced inside the threshold, whichever way it leans", () => {
    // 1% of turnover, under the 2% lean threshold.
    assert.equal(flowStateOf(10_000_000, turnover), "BALANCED");
    assert.equal(flowStateOf(-10_000_000, turnover), "BALANCED");
  });

  it("calls accumulation and distribution past the threshold", () => {
    assert.equal(flowStateOf(30_000_000, turnover), "ACCUMULATION");
    assert.equal(flowStateOf(-30_000_000, turnover), "DISTRIBUTION");
  });

  it("scales with turnover rather than using a rupiah figure", () => {
    // The same 50M is decisive on a small listing and noise on a large one —
    // which is the whole reason the threshold is a ratio.
    assert.equal(flowStateOf(50_000_000, 100_000_000), "ACCUMULATION");
    assert.equal(flowStateOf(50_000_000, 100_000_000_000), "BALANCED");
  });

  it("sits exactly on the boundary predictably", () => {
    const atLean = turnover * FLOW_THRESHOLDS.lean;
    assert.equal(flowStateOf(atLean, turnover), "ACCUMULATION");
    assert.equal(flowStateOf(atLean - 1, turnover), "BALANCED");
  });

  it("treats a period with no turnover as balanced, not as a divide by zero", () => {
    assert.equal(netFlowRatio(0, 0), 0);
    assert.equal(flowStateOf(0, 0), "BALANCED");
  });

  it("grades the bias as moderate or strong", () => {
    assert.equal(flowBiasLabel(30_000_000, turnover), "Moderate Accumulation");
    assert.equal(flowBiasLabel(60_000_000, turnover), "Strong Accumulation");
    assert.equal(flowBiasLabel(-60_000_000, turnover), "Strong Distribution");
    assert.equal(flowBiasLabel(1_000_000, turnover), "Balanced Flow");
  });
});

describe("concentration", () => {
  it("measures absolute flow, so a big seller counts as much as a big buyer", () => {
    const spread = concentrationOf([{ netValue: 50 }, { netValue: -50 }, { netValue: 1 }]);
    const oneSided = concentrationOf([{ netValue: 50 }, { netValue: 50 }, { netValue: 1 }]);
    assert.equal(spread.top1Percent, oneSided.top1Percent);
  });

  it("reports the share held by the largest one, three and five", () => {
    const c = concentrationOf([
      { netValue: 40 },
      { netValue: -30 },
      { netValue: 20 },
      { netValue: -5 },
      { netValue: 4 },
      { netValue: 1 },
    ]);
    assert.equal(c.top1Percent, 40);
    assert.equal(c.top3Percent, 90);
    assert.equal(c.top5Percent, 99);
  });

  it("never exceeds 100, and reaches it when one broker is everything", () => {
    assert.equal(concentrationOf([{ netValue: 7 }]).top1Percent, 100);
    assert.equal(concentrationOf([{ netValue: 7 }]).top5Percent, 100);
  });

  it("returns zeroes rather than NaN when nothing traded", () => {
    assert.deepEqual(concentrationOf([]), { top1Percent: 0, top3Percent: 0, top5Percent: 0 });
    assert.deepEqual(concentrationOf([{ netValue: 0 }]), {
      top1Percent: 0,
      top3Percent: 0,
      top5Percent: 0,
    });
  });
});

describe("average price", () => {
  it("divides value by shares, not by lots", () => {
    // 1,000 lots = 100,000 shares. Rp 500,000,000 / 100,000 = Rp 5,000.
    assert.equal(averagePrice(500_000_000, 1_000), 5_000);
  });

  it("is null when that side never traded", () => {
    assert.equal(averagePrice(0, 0), null);
    assert.equal(averagePrice(1_000, 0), null);
  });
});

describe("share of total", () => {
  it("is a percentage of the whole, and zero when there is no whole", () => {
    assert.equal(sharePercent(25, 200), 12.5);
    assert.equal(sharePercent(5, 0), 0);
  });
});

describe("price and flow quadrant", () => {
  it("names each of the four combinations", () => {
    assert.equal(priceFlowState(100, 120, 5), "PRICE_UP_FLOW_UP");
    assert.equal(priceFlowState(100, 120, -5), "PRICE_UP_FLOW_DOWN");
    assert.equal(priceFlowState(120, 100, 5), "PRICE_DOWN_FLOW_UP");
    assert.equal(priceFlowState(120, 100, -5), "PRICE_DOWN_FLOW_DOWN");
  });

  it("says so when there is no price history rather than guessing", () => {
    assert.equal(priceFlowState(null, 120, 5), "UNAVAILABLE");
    assert.equal(priceFlowState(100, null, 5), "UNAVAILABLE");
    assert.equal(priceFlowState(0, 100, 5), "UNAVAILABLE");
  });
});

describe("insight sentence", () => {
  const broker = (brokerCode: string, netValue: number): BrokerFlow => ({
    brokerCode,
    brokerName: null,
    buyValue: 0,
    sellValue: 0,
    netValue,
    buyLots: 0,
    sellLots: 0,
    netLots: 0,
    buySharePercent: 0,
    sellSharePercent: 0,
    avgBuyPrice: null,
    avgSellPrice: null,
    tradingDays: 0,
    daily: [],
  });

  it("names the strongest buyer and seller by broker code", () => {
    const text = buildInsight({
      netValue: -46_440_000,
      totalTradedValue: 1_000_000_000,
      topBuyer: broker("SS", 268_530_000),
      topSeller: broker("RF", -256_390_000),
      concentration: { top1Percent: 18.4, top3Percent: 39.2, top5Percent: 56.8 },
    });

    assert.match(text, /Net distribution/);
    assert.match(text, /SS was the strongest net buyer/);
    assert.match(text, /RF was the largest net seller/);
    assert.match(text, /relatively dispersed/);
  });

  it("is deterministic — the same inputs give the same sentence", () => {
    const input = {
      netValue: 500_000_000,
      totalTradedValue: 1_000_000_000,
      topBuyer: broker("LG", 100),
      topSeller: broker("CP", -100),
      concentration: { top1Percent: 70, top3Percent: 80, top5Percent: 90 },
    };
    assert.equal(buildInsight(input), buildInsight(input));
    assert.match(buildInsight(input), /concentrated in a small number of brokers/);
  });

  it("never claims an investor identity", () => {
    const text = buildInsight({
      netValue: 900_000_000,
      totalTradedValue: 1_000_000_000,
      topBuyer: broker("SS", 900_000_000),
      topSeller: null,
      concentration: { top1Percent: 99, top3Percent: 99, top5Percent: 99 },
    });
    for (const word of ["institution", "insider", "whale", "smart money"]) {
      assert.equal(text.toLowerCase().includes(word), false, `insight said "${word}"`);
    }
  });

  it("says nothing traded rather than describing a flow of zero", () => {
    const text = buildInsight({
      netValue: 0,
      totalTradedValue: 0,
      topBuyer: null,
      topSeller: null,
      concentration: { top1Percent: 0, top3Percent: 0, top5Percent: 0 },
    });
    assert.match(text, /No broker transactions were recorded/);
  });

  it("omits a side that has no net buyer or seller", () => {
    const text = buildInsight({
      netValue: 10,
      totalTradedValue: 1000,
      topBuyer: broker("AA", -5),
      topSeller: broker("BB", 5),
      concentration: { top1Percent: 10, top3Percent: 20, top5Percent: 30 },
    });
    assert.equal(text.includes("strongest net buyer"), false);
    assert.equal(text.includes("largest net seller"), false);
  });
});

describe("buy/sell ratio", () => {
  it("says whether the two sides were the same size", async () => {
    const { buySellRatio } = await import("./broker-flow-math");
    assert.equal(buySellRatio(100, 100), 1);
    assert.equal(buySellRatio(150, 100), 1.5);
    assert.equal(buySellRatio(50, 100), 0.5);
  });

  it("is null rather than Infinity when nothing sold", async () => {
    const { buySellRatio } = await import("./broker-flow-math");
    assert.equal(buySellRatio(100, 0), null);
    assert.equal(buySellRatio(0, 0), null);
  });

  it("is a different fact from a small net", async () => {
    const { buySellRatio, flowStateOf } = await import("./broker-flow-math");
    // A quiet stock and a heavily traded one that balanced both net near zero,
    // but only one of them saw real two-way turnover.
    assert.equal(flowStateOf(0, 200), "BALANCED");
    assert.equal(flowStateOf(0, 2_000_000), "BALANCED");
    assert.equal(buySellRatio(100, 100), buySellRatio(1_000_000, 1_000_000));
  });
});

describe("a balanced period reads as balanced everywhere", () => {
  it("does not label a tiny negative net as a downward bias", async () => {
    const { flowStateOf, flowBiasLabel } = await import("./broker-flow-math");
    // Measured on ADRO: -Rp 1.19M against Rp 2.51T of turnover.
    const net = -1_190_000;
    const turnover = 2_510_000_000_000;

    assert.equal(flowStateOf(net, turnover), "BALANCED");
    assert.equal(flowBiasLabel(net, turnover), "Balanced Flow");
    // The card's mark is derived from the state, so it must not say "down".
    assert.equal(flowBiasLabel(net, turnover).includes("Distribution"), false);
  });
});
