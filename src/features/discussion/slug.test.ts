import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { toSlug } from "./slug";

describe("discussion slug", () => {
  it("turns a title into a URL key", () => {
    assert.equal(toSlug("Market Outlook — September 2026"), "market-outlook-september-2026");
    assert.equal(toSlug("Coal Stocks: Cyclical or Structural?"), "coal-stocks-cyclical-or-structural");
  });

  it("strips accents rather than dropping the letters", () => {
    // Otherwise "Análisa" and "Analisa" become different slugs.
    assert.equal(toSlug("Análisa Pasar"), "analisa-pasar");
  });

  it("never emits leading, trailing or doubled separators", () => {
    assert.equal(toSlug("  ...Banking Sector!!  "), "banking-sector");
    assert.equal(toSlug("A -- B"), "a-b");
  });

  it("falls back when a title leaves nothing behind", () => {
    assert.equal(toSlug("???"), "discussion");
    assert.equal(toSlug("   "), "discussion");
  });

  it("refuses the segments the router owns", () => {
    // /discussion/new is the editor; a thread titled "New" must not shadow it.
    assert.equal(toSlug("New"), "new-discussion");
    assert.equal(toSlug("Edit"), "edit-discussion");
    assert.equal(toSlug("Guidelines"), "guidelines-discussion");
    assert.equal(toSlug("Contributors"), "contributors-discussion");
  });

  it("keeps slugs inside the column", () => {
    assert.equal(toSlug("word ".repeat(100)).length <= 200, true);
    assert.equal(toSlug("word ".repeat(100)).endsWith("-"), false);
  });
});
