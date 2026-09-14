import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { isSafeHref, parseContent, parseInline } from "./discussion-content";

describe("discussion content blocks", () => {
  it("groups consecutive bullets into one list", () => {
    const blocks = parseContent("Intro\n\n- one\n- two\n- three\n\nOutro");
    assert.equal(blocks.length, 3);
    assert.equal(blocks[1].kind, "bullets");
    assert.equal(blocks[1].kind === "bullets" && blocks[1].items.length, 3);
  });

  it("does not let a list swallow the paragraph after it", () => {
    const blocks = parseContent("- one\n- two\nAfter the list");
    assert.deepEqual(blocks.map((b) => b.kind), ["bullets", "paragraph"]);
  });

  it("reads numbered lists and keeps them separate from bullets", () => {
    const blocks = parseContent("1. first\n2. second\n\n- bullet");
    assert.deepEqual(blocks.map((b) => b.kind), ["numbers", "bullets"]);
  });

  it("starts headings at h3, because the page owns h1 and h2", () => {
    const blocks = parseContent("## Global\n\n### Detail");
    assert.deepEqual(
      blocks.map((b) => (b.kind === "heading" ? b.level : null)),
      [3, 4],
    );
  });

  it("joins wrapped lines into one paragraph", () => {
    const blocks = parseContent("a line\nand its continuation");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].kind === "paragraph" && blocks[0].content[0].value, "a line and its continuation");
  });

  it("reads images and quotes", () => {
    const blocks = parseContent("![Chart](/api/v1/uploads/x.png)\n\n> a quote");
    assert.deepEqual(blocks.map((b) => b.kind), ["image", "quote"]);
    assert.equal(blocks[0].kind === "image" && blocks[0].src, "/api/v1/uploads/x.png");
  });
});

describe("discussion inline", () => {
  it("finds bold, italic, links and tickers", () => {
    const parts = parseInline("**bold** and *thin* and [here](https://x.test) and $BBCA");
    assert.deepEqual(
      parts.filter((p) => p.kind !== "text").map((p) => [p.kind, p.value]),
      [
        ["bold", "bold"],
        ["italic", "thin"],
        ["link", "here"],
        ["ticker", "BBCA"],
      ],
    );
  });

  it("keeps the text around the markers", () => {
    const parts = parseInline("before **x** after");
    assert.equal(parts.map((p) => p.value).join(""), "before x after");
  });

  it("leaves a bare dollar amount alone", () => {
    // $12 is money, not a ticker.
    assert.equal(parseInline("$12 and $A").every((p) => p.kind === "text"), true);
  });
});

describe("link safety", () => {
  it("allows the schemes a discussion needs", () => {
    for (const href of ["https://idx.co.id", "http://x.test", "/discussion/1", "mailto:a@b.co"]) {
      assert.equal(isSafeHref(href), true, href);
    }
  });

  it("refuses script and data URLs", () => {
    // A body is admin-written, but "trusted author" is not a reason to let a
    // compromised session become script execution in every reader's browser.
    for (const href of ["javascript:alert(1)", "  JavaScript:alert(1)", "data:text/html,<script>", "vbscript:x"]) {
      assert.equal(isSafeHref(href), false, href);
    }
  });
});
