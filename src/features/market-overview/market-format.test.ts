import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  SHARES_PER_LOT,
  formatCompact,
  formatFrequency,
  formatIndexLevel,
  formatLots,
  formatPercent,
  formatPoints,
  formatRupiah,
  formatRupiahSigned,
  formatShares,
  formatTradingDate,
} from "./market-format";

describe("rupiah formatting", () => {
  it("matches the units the brief specifies", () => {
    assert.equal(formatRupiah(1_000_000_000), "Rp 1.00B");
    assert.equal(formatRupiah(732_810_000_000), "Rp 732.81B");
    assert.equal(formatRupiah(3_990_000_000_000), "Rp 3.99T");
  });

  it("keeps the sign outside the currency", () => {
    assert.equal(formatRupiah(-732_810_000_000), "-Rp 732.81B");
    assert.equal(formatRupiahSigned(640_000_000_000), "+Rp 640.00B");
    assert.equal(formatRupiahSigned(-732_623_230_000), "-Rp 732.62B");
  });

  it("does not abbreviate below a thousand", () => {
    assert.equal(formatRupiah(0), "Rp 0");
    assert.equal(formatRupiah(999), "Rp 999");
  });
});

describe("volume units", () => {
  it("reports shares as shares", () => {
    assert.equal(formatShares(28_617_128_161), "28.62B");
  });

  it("converts to lots only when asked, at 100 shares per lot", () => {
    assert.equal(SHARES_PER_LOT, 100);
    assert.equal(formatLots(28_617_128_161), "286.17M");
    // The same input must not render identically under both labels, which is
    // the mistake the brief calls out.
    assert.notEqual(formatShares(1_000_000), formatLots(1_000_000));
  });
});

describe("index and percentage formatting", () => {
  it("renders the index with thousands and two decimals", () => {
    assert.equal(formatIndexLevel(6541.377), "6,541.38");
    assert.equal(formatIndexLevel(6541.38), "6,541.38");
  });

  it("rounds percentages to two decimals and always signs them", () => {
    assert.equal(formatPercent(-0.7332), "-0.73%");
    assert.equal(formatPercent(0.72), "+0.72%");
    assert.equal(formatPercent(0), "0.00%");
  });

  it("signs point changes", () => {
    assert.equal(formatPoints(-47.961), "-47.96");
    assert.equal(formatPoints(47.961), "+47.96");
  });

  it("abbreviates frequency", () => {
    assert.equal(formatFrequency(1_940_000), "1.94M");
    assert.equal(formatFrequency(1_916_611), "1.92M");
  });
});

describe("compact numbers", () => {
  it("picks the right unit at each boundary", () => {
    assert.equal(formatCompact(999), "999");
    assert.equal(formatCompact(1_000), "1.00K");
    assert.equal(formatCompact(1_000_000), "1.00M");
    assert.equal(formatCompact(1_000_000_000), "1.00B");
    assert.equal(formatCompact(1_000_000_000_000), "1.00T");
  });
});

describe("trading dates", () => {
  it("renders a session date in Jakarta terms", () => {
    // Parsed as WIB, so it cannot slip a day backwards in a western timezone.
    assert.equal(formatTradingDate("2026-09-11"), "11 Sep 2026");
    assert.equal(formatTradingDate("2026-01-01"), "1 Jan 2026");
  });
});
