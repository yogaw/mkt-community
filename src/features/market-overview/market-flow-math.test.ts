import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { flowDirection, isFlowConsistent, netShareOfTurnover } from "./market-flow-math";
import type { ForeignFlowDto } from "./market-overview-types";

/** The real 2026-09-11 Regular-market figures. */
const REGULAR: ForeignFlowDto = {
  buyValue: 3_991_310_486_800,
  sellValue: 4_723_933_716_800,
  netValue: -732_623_230_000,
  buyVolume: 4_977_805_400,
  sellVolume: 5_496_940_700,
  netVolume: -519_135_300,
  totalValue: 13_679_613_216_000,
};

describe("foreign flow identities", () => {
  it("holds for real IDX-derived figures", () => {
    assert.equal(isFlowConsistent(REGULAR), true);
    assert.equal(REGULAR.netValue, REGULAR.buyValue - REGULAR.sellValue);
  });

  it("rejects a net that does not equal buy minus sell", () => {
    assert.equal(isFlowConsistent({ ...REGULAR, netValue: 1 }), false);
    assert.equal(isFlowConsistent({ ...REGULAR, netVolume: 1 }), false);
  });
});

describe("net share of turnover", () => {
  it("expresses net flow against the scope's own turnover", () => {
    assert.equal(netShareOfTurnover(REGULAR), -5.36);
  });

  it("returns null rather than dividing by zero", () => {
    assert.equal(netShareOfTurnover({ ...REGULAR, totalValue: 0 }), null);
  });
});

describe("flow direction", () => {
  it("names the three cases", () => {
    assert.equal(flowDirection(1), "inflow");
    assert.equal(flowDirection(-1), "outflow");
    assert.equal(flowDirection(0), "flat");
  });
});
