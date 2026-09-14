import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { Instrument } from "./market-data-model";
import {
  describeInstrument,
  formatChange,
  formatChangePercent,
  formatValue,
  isFavourable,
} from "./instrument-format";

function instrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    symbol: "TEST", name: "Test", category: "Equity", market: "global",
    benchmark: null, exchange: null, currency: "Index", unit: null, decimals: 2,
    value: 100, change: 1, changePercent: 1, previousClose: 99,
    dayLow: null, dayHigh: null, yearLow: null, yearHigh: null,
    source: "Test", dataStatus: "END_OF_DAY", delayMinutes: null, timestamp: "2026-09-11",
    invertTone: false, preferBasisPoints: false, history: [],
    ...overrides,
  };
}

describe("instrument formatting", () => {
  it("groups every currency the same way, rupiah included", () => {
    // IHSG once rendered as "6.541,38" beside a change of "-47.96".
    assert.equal(formatValue(instrument({ currency: "IDR" }), 6541.38), "6,541.38");
    assert.equal(formatValue(instrument({ currency: "Index" }), 7656.98), "7,656.98");
    assert.equal(formatValue(instrument({ currency: "USD" }), 104.61), "$104.61");
    assert.equal(formatValue(instrument({ currency: "USc" }), 612), "612.00¢");
    assert.equal(formatValue(instrument({ currency: "%" }), 4.98), "4.98%");
    assert.equal(formatValue(instrument({ currency: "bps" }), 82.5), "82.50 bps");
  });

  it("honours each instrument's own precision", () => {
    assert.equal(formatValue(instrument({ decimals: 0, currency: "IDR" }), 17606), "17,606");
    assert.equal(formatValue(instrument({ decimals: 4 }), 1.16012), "1.1601");
  });

  it("quotes a rate move in basis points, not a percentage of a percentage", () => {
    const yield10y = instrument({ currency: "%", preferBasisPoints: true, change: 0.03, changePercent: 0.63 });
    assert.equal(formatChange(yield10y), "+3 bps");
    assert.equal(formatChange(instrument({ preferBasisPoints: true, change: -0.07 })), "-7 bps");
    assert.equal(formatChange(instrument({ preferBasisPoints: true, change: 0 })), "0 bps");
  });

  it("always signs a price change and matches the instrument's decimals", () => {
    assert.equal(formatChange(instrument({ change: 1.7 })), "+1.70");
    assert.equal(formatChange(instrument({ change: -3.02 })), "-3.02");
    assert.equal(formatChange(instrument({ change: null })), "—");
    assert.equal(formatChange(instrument({ change: -0.003, decimals: 3 })), "-0.003");
    assert.equal(formatChangePercent(instrument({ changePercent: null })), "—");
    assert.equal(formatChangePercent(instrument({ changePercent: 0.86 })), "+0.86%");
  });

  it("reads a fall in a risk gauge as good news", () => {
    const vix = instrument({ invertTone: true, changePercent: -11.21 });
    assert.equal(isFavourable(vix), true);
    assert.equal(isFavourable(instrument({ invertTone: true, changePercent: 2 })), false);
    assert.equal(isFavourable(instrument({ changePercent: 2 })), true);
    assert.equal(isFavourable(instrument({ changePercent: 0 })), null);
    assert.equal(isFavourable(instrument({ changePercent: null })), null);
  });

  it("says which contract a commodity price refers to", () => {
    const brent = instrument({
      benchmark: "ICE Brent Crude", exchange: "ICE", currency: "USD", unit: "barrel",
    });
    assert.equal(describeInstrument(brent), "ICE Brent Crude · USD / barrel");
    assert.equal(describeInstrument(instrument({ exchange: "CBOE" })), "CBOE · Index");
  });
});
