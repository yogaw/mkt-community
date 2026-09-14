import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BROKER_PALETTE, brokerColor, contrastRatio } from "./broker-colors";

/** The two grounds a broker line is ever drawn on, from globals.css. */
const LIGHT_PANEL = "#ffffff";
const DARK_PANEL = "#15181a";

describe("broker colours", () => {
  it("gives the same broker the same colour every time", () => {
    // Otherwise a line changes colour whenever the ranking reshuffles.
    assert.equal(brokerColor("YU"), brokerColor("YU"));
    assert.equal(brokerColor("SS"), brokerColor("SS"));
  });

  it("does not depend on position, so a reorder repaints nothing", () => {
    const first = ["YU", "BB", "TP"].map(brokerColor);
    const reordered = ["TP", "YU", "BB"].map(brokerColor);
    assert.equal(reordered[0], first[2]);
    assert.equal(reordered[1], first[0]);
  });

  it("stays legible on both themes' panels", () => {
    // 2.5:1 is the practical floor for a 1.8px line against its background;
    // the first palette here had entries under 1.5:1 on the dark panel.
    for (const colour of BROKER_PALETTE) {
      const light = contrastRatio(colour, LIGHT_PANEL);
      const dark = contrastRatio(colour, DARK_PANEL);
      assert.ok(light >= 2.0, `${colour} is ${light.toFixed(2)}:1 on the light panel`);
      assert.ok(dark >= 2.5, `${colour} is ${dark.toFixed(2)}:1 on the dark panel`);
    }
  });

  it("keeps the palette distinct, so two lines are not the same colour", () => {
    assert.equal(new Set(BROKER_PALETTE).size, BROKER_PALETTE.length);
  });

  it("spreads real broker codes across the palette", () => {
    const codes = ["YU", "BB", "TP", "AK", "XL", "BK", "KZ", "RX", "AZ", "CP"];
    const used = new Set(codes.map(brokerColor));
    // A hash that collapsed everything onto two hues would make the chart
    // unreadable even though each colour passed the contrast check.
    assert.ok(used.size >= 7, `only ${used.size} distinct colours across 10 brokers`);
  });
});
