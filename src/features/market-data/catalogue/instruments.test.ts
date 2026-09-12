import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { INDICATOR_SOURCES } from "../../../../prisma/indicator-sources";
import {
  DEFAULT_INSTRUMENT,
  INSTRUMENTS,
  SECTION_CATEGORIES,
  isVisibleInEnvironment,
} from "./instruments";
import { MARKET_SECTIONS } from "../market-data-model";

describe("instrument catalogue", () => {
  it("has a running ingestion behind every connected instrument", () => {
    const ingested = new Set(INDICATOR_SOURCES.map((item) => item.code));
    for (const instrument of INSTRUMENTS) {
      if (instrument.feed.kind === "db") {
        assert.equal(
          ingested.has(instrument.feed.code),
          true,
          `${instrument.symbol} reads code "${instrument.feed.code}", which nothing writes`,
        );
      }
    }
  });

  it("never labels a generated series as a real one", () => {
    for (const instrument of INSTRUMENTS) {
      assert.equal(
        instrument.feed.kind === "sample",
        instrument.dataStatus === "SAMPLE",
        `${instrument.symbol} disagrees about whether its data is real`,
      );
    }
  });

  it("drops every generated series in production", () => {
    const shown = INSTRUMENTS.filter((item) => isVisibleInEnvironment(item, true));
    assert.equal(shown.some((item) => item.feed.kind === "sample"), false);
    assert.equal(shown.length < INSTRUMENTS.length, true);
  });

  it("defaults each section to an instrument that survives production", () => {
    for (const section of MARKET_SECTIONS) {
      const definition = INSTRUMENTS.find((item) => item.symbol === DEFAULT_INSTRUMENT[section]);
      assert.ok(definition, `${section} defaults to an unknown symbol`);
      assert.equal(definition.market, section);
      assert.equal(
        definition.feed.kind,
        "db",
        `${section} defaults to ${definition.symbol}, which is dropped in production`,
      );
    }
  });

  it("uses symbols that are unique and categories the section offers", () => {
    const seen = new Set<string>();
    for (const instrument of INSTRUMENTS) {
      assert.equal(seen.has(instrument.symbol), false, `${instrument.symbol} is listed twice`);
      seen.add(instrument.symbol);
      assert.equal(
        SECTION_CATEGORIES[instrument.market].includes(instrument.category),
        true,
        `${instrument.symbol} is a "${instrument.category}", which ${instrument.market} does not offer as a filter`,
      );
    }
  });

  it("names a benchmark wherever the number is contract-specific", () => {
    for (const instrument of INSTRUMENTS.filter((item) => item.market === "commodities")) {
      assert.ok(instrument.benchmark, `${instrument.symbol} does not say which contract it quotes`);
      assert.ok(instrument.unit, `${instrument.symbol} does not say what it is priced per`);
    }
  });

  it("quotes rates in basis points rather than percent change", () => {
    for (const instrument of INSTRUMENTS.filter((item) => item.currency === "%")) {
      assert.equal(
        instrument.preferBasisPoints,
        true,
        `${instrument.symbol} is a rate but would be shown as a percentage change of a percentage`,
      );
    }
  });
});
