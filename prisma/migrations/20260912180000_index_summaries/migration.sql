-- Daily COMPOSITE (IHSG) index figures from IDX TradingSummary/GetIndexSummary.
-- One row per trading day; only the fields we actually use are kept, not the
-- full payload.

-- CreateTable
CREATE TABLE "public"."index_summaries" (
    "id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
    "date" DATE NOT NULL,
    "close" DECIMAL(15,3) NOT NULL,
    "volume" BIGINT,
    "value" BIGINT,
    -- IDX serialises this as a float around 1.1e16, past the 2^53 mark where
    -- float64 stops being exact. numeric keeps whatever precision arrives
    -- instead of rounding it a second time on the way in.
    "market_capital" DECIMAL(30,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "index_summaries_pkey" PRIMARY KEY ("id"),
    -- One COMPOSITE row per day; also the upsert target. No separate index on
    -- date, since this constraint already provides one.
    CONSTRAINT "uq_index_summary_date" UNIQUE ("date")
);
