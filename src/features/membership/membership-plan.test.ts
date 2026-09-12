import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  PREMIUM_PLAN,
  VAT_RATE,
  formatIdr,
  periodLabel,
  priceBreakdown,
} from "./membership-plan";

describe("premium plan", () => {
  it("is priced at Rp 800.000 per month", () => {
    assert.equal(PREMIUM_PLAN.priceIdr, 800_000);
    assert.equal(PREMIUM_PLAN.period, "month");
    assert.equal(periodLabel(PREMIUM_PLAN), "per month");
  });
});

describe("price breakdown", () => {
  it("adds 11% VAT to the monthly price", () => {
    const breakdown = priceBreakdown(PREMIUM_PLAN);
    assert.equal(breakdown.subtotalIdr, 800_000);
    assert.equal(breakdown.vatIdr, 88_000);
    assert.equal(breakdown.totalIdr, 888_000);
  });

  it("always totals exactly what the two lines above it show", () => {
    // The displayed lines must reconcile for any price, including ones whose
    // tax does not land on a whole rupiah.
    for (const priceIdr of [800_000, 99_000, 1, 333_333, 1_234_567]) {
      const breakdown = priceBreakdown({ ...PREMIUM_PLAN, priceIdr });
      assert.equal(breakdown.totalIdr, breakdown.subtotalIdr + breakdown.vatIdr);
      assert.equal(Number.isInteger(breakdown.vatIdr), true);
      assert.equal(Number.isInteger(breakdown.totalIdr), true);
    }
  });

  it("uses the shared rate by default and accepts an override", () => {
    assert.equal(VAT_RATE, 0.11);
    assert.equal(priceBreakdown(PREMIUM_PLAN, 0).vatIdr, 0);
    assert.equal(priceBreakdown(PREMIUM_PLAN, 0.12).vatIdr, 96_000);
  });
});

describe("rupiah formatting", () => {
  it("groups with dots and drops decimals", () => {
    assert.equal(formatIdr(800_000), "Rp 800.000");
    assert.equal(formatIdr(88_000), "Rp 88.000");
    assert.equal(formatIdr(888_000), "Rp 888.000");
  });

  it("renders a plain space, not whatever ICU prefers today", () => {
    assert.equal(formatIdr(800_000).includes(" "), false);
    assert.match(formatIdr(1_000), /^Rp \d/);
  });
});
