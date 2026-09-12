import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { CATEGORY_STYLE, formatViews, pluralize } from "./discussion-display";
import { DISCUSSION_CATEGORIES } from "./discussion-types";

describe("discussion display", () => {
  it("shows an exact figure until it stops being readable", () => {
    assert.equal(formatViews(0), "0");
    assert.equal(formatViews(1), "1");
    assert.equal(formatViews(651), "651");
    assert.equal(formatViews(999), "999");
  });

  it("switches to thousands at a thousand, with one decimal while it helps", () => {
    assert.equal(formatViews(1000), "1.0K");
    assert.equal(formatViews(1842), "1.8K");
    assert.equal(formatViews(3412), "3.4K");
    // Past ten thousand the decimal is noise, not precision.
    assert.equal(formatViews(10_400), "10K");
    assert.equal(formatViews(999_400), "999K");
  });

  it("switches to millions, so a popular thread does not read as 1240K", () => {
    assert.equal(formatViews(1_000_000), "1.0M");
    assert.equal(formatViews(2_450_000), "2.5M");
  });

  it("pluralizes, including the words that do not take an s", () => {
    assert.equal(pluralize(1, "discussion"), "1 discussion");
    assert.equal(pluralize(0, "discussion"), "0 discussions");
    assert.equal(pluralize(1, "reply", "replies"), "1 reply");
    assert.equal(pluralize(4, "reply", "replies"), "4 replies");
  });

  it("styles every category, so no room renders without a colour", () => {
    for (const category of DISCUSSION_CATEGORIES) {
      const style = CATEGORY_STYLE[category];
      assert.ok(style, `${category} has no style`);
      assert.ok(style.label.length > 0);
      assert.ok(style.blurb.length > 0);
      assert.ok(style.tint.includes("bg-"));
    }
  });

  it("gives each category its own colour, so the chips stay distinguishable", () => {
    const tints = DISCUSSION_CATEGORIES.map((category) => CATEGORY_STYLE[category].tint);
    assert.equal(new Set(tints).size, tints.length);
  });
});
