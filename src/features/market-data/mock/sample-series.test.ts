import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { sampleSeries } from "./sample-series";

describe("sample series", () => {
  it("is deterministic for a symbol", () => {
    const spec = { base: 100, volatility: 0.01, drift: 0 };
    const first = sampleSeries("TEST", spec, 30, "2026-09-11");
    const second = sampleSeries("TEST", spec, 30, "2026-09-11");
    assert.deepEqual(first, second);
  });

  it("gives different symbols different series", () => {
    const spec = { base: 100, volatility: 0.01, drift: 0 };
    const a = sampleSeries("AAA", spec, 30, "2026-09-11");
    const b = sampleSeries("BBB", spec, 30, "2026-09-11");
    assert.notDeepEqual(a.map((p) => p.close), b.map((p) => p.close));
  });

  it("ends on the anchor date with the base value", () => {
    const points = sampleSeries("TEST", { base: 147.35, volatility: 0.01, drift: 0 }, 40, "2026-09-11");
    assert.equal(points.at(-1)!.date, "2026-09-11");
    assert.equal(points.at(-1)!.close, 147.35);
  });

  it("holds a zero-volatility rate exactly flat", () => {
    const points = sampleSeries("BIRATE", { base: 5.75, volatility: 0, drift: 0 }, 50, "2026-09-11");
    assert.equal(new Set(points.map((p) => p.close)).size, 1);
    assert.equal(points[0].close, 5.75);
  });

  it("emits weekdays only, oldest first", () => {
    const points = sampleSeries("TEST", { base: 10, volatility: 0.01, drift: 0 }, 25, "2026-09-11");
    assert.equal(points.length, 25);
    for (const point of points) {
      const day = new Date(`${point.date}T00:00:00Z`).getUTCDay();
      assert.notEqual(day, 0);
      assert.notEqual(day, 6);
    }
    for (let index = 1; index < points.length; index += 1) {
      assert.equal(points[index].date > points[index - 1].date, true);
    }
  });
});
