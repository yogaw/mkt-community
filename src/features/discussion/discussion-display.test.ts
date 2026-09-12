import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { CATEGORY_STYLE, formatCount, formatJakartaDateTime, pluralize } from "./discussion-display";
import { DISCUSSION_CATEGORIES } from "./discussion-types";

describe("counts", () => {
  it("stays exact until a figure stops being readable", () => {
    assert.equal(formatCount(0), "0");
    assert.equal(formatCount(742), "742");
    assert.equal(formatCount(999), "999");
  });

  it("switches to thousands at a thousand, with one decimal while it helps", () => {
    assert.equal(formatCount(1000), "1.0K");
    assert.equal(formatCount(1842), "1.8K");
    assert.equal(formatCount(3412), "3.4K");
    // Past ten thousand the decimal is noise, not precision.
    assert.equal(formatCount(10_400), "10K");
  });

  it("switches to millions, so a popular thread does not read as 1240K", () => {
    assert.equal(formatCount(1_000_000), "1.0M");
    assert.equal(formatCount(2_450_000), "2.5M");
  });

  it("pluralizes, including the words that do not take an s", () => {
    assert.equal(pluralize(1, "discussion"), "1 discussion");
    assert.equal(pluralize(0, "discussion"), "0 discussions");
    assert.equal(pluralize(1, "Comment"), "1 Comment");
    assert.equal(pluralize(4, "reply", "replies"), "4 replies");
  });
});

describe("Jakarta timestamps", () => {
  it("shows the market's own clock, not the reader's", () => {
    // 02:12Z is 09:12 in Jakarta.
    assert.equal(formatJakartaDateTime("2026-09-16T02:12:00.000Z"), "16 Sep 2026, 09:12 WIB");
  });

  it("abbreviates months the way the rest of the app does", () => {
    // en-GB would print "Sept" here, beside formatDate's "Sep" on the same page.
    assert.match(formatJakartaDateTime("2026-09-16T02:12:00.000Z"), /\bSep\b/);
    assert.equal(formatJakartaDateTime("2026-09-16T02:12:00.000Z").includes("Sept"), false);
  });

  it("rolls the date over when Jakarta is already tomorrow", () => {
    assert.equal(formatJakartaDateTime("2026-09-16T19:00:00.000Z"), "17 Sep 2026, 02:00 WIB");
  });

  it("keeps a leading zero on the hour", () => {
    assert.match(formatJakartaDateTime("2026-09-16T00:05:00.000Z"), /07:05 WIB$/);
  });
});

describe("category styling", () => {
  it("styles every category, so no room renders without a colour", () => {
    for (const category of DISCUSSION_CATEGORIES) {
      const style = CATEGORY_STYLE[category];
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
