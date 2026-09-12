import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { contentDisposition } from "./content-disposition";

/** Header values must be latin-1; this is the constraint the platform enforces. */
function isByteString(value: string): boolean {
  return [...value].every((character) => character.charCodeAt(0) <= 255);
}

describe("content disposition", () => {
  it("survives the em dash that broke the download route", () => {
    const header = contentDisposition(
      "inline",
      "Erajaya Swasembada (ERAA) — Building New Growth Engines.pdf",
    );
    assert.equal(isByteString(header), true);
    assert.match(header, /filename="Erajaya Swasembada \(ERAA\) - Building New Growth Engines\.pdf"/);
    assert.match(header, /filename\*=UTF-8''/);
  });

  it("keeps the real name in the encoded parameter", () => {
    const header = contentDisposition("inline", "Laporan — Q1.pdf");
    assert.equal(decodeURIComponent(header.split("filename*=UTF-8''")[1]), "Laporan — Q1.pdf");
  });

  it("never emits a value a header cannot carry", () => {
    for (const name of ["漢字レポート.pdf", "naïve café.pdf", "—".repeat(20), "Ω≈ç√.pdf"]) {
      assert.equal(isByteString(contentDisposition("attachment", name)), true);
    }
  });

  it("strips quotes and separators that would break out of the header", () => {
    const header = contentDisposition("inline", 'evil"; rm -rf /x.pdf');
    assert.equal(header.includes('"; rm'), false);
    assert.equal(isByteString(header), true);
  });

  it("falls back to a usable name when nothing survives", () => {
    assert.match(contentDisposition("inline", "———"), /filename="-"/);
    assert.match(contentDisposition("inline", "   "), /filename="document"/);
  });
});
