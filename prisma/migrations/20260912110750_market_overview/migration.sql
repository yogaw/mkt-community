-- Market-overview storage. These tables sit outside the Prisma datamodel, like
-- their siblings stock_summaries / broker_summaries / index_summaries, because
-- they hold ingested market data rather than application state.
--
-- UNITS (verified against IDX on 2026-09-12, see docs/idx-market-data.md):
--   index_summaries.close/previous/high/low/change  IHSG points
--   index_summaries.volume                          SHARES (not lots)
--   index_summaries.value                           IDR
--   index_summaries.frequency                       trade count
--   market_flow_daily.*_value                       IDR
--   market_flow_daily.*_volume                      SHARES

-- 1. Widen index_summaries to the rest of the COMPOSITE record. GetIndexSummary
--    returns no Open, so there is no open column: IDX does not publish one here.
ALTER TABLE index_summaries
  ADD COLUMN IF NOT EXISTS previous        numeric(15,3),
  ADD COLUMN IF NOT EXISTS high            numeric(15,3),
  ADD COLUMN IF NOT EXISTS low             numeric(15,3),
  ADD COLUMN IF NOT EXISTS change          numeric(15,3),
  ADD COLUMN IF NOT EXISTS frequency       bigint,
  ADD COLUMN IF NOT EXISTS number_of_stock integer,
  ADD COLUMN IF NOT EXISTS source          varchar(40) NOT NULL DEFAULT 'idx:GetIndexSummary',
  ADD COLUMN IF NOT EXISTS ingested_at     timestamptz NOT NULL DEFAULT now();

-- 2. Foreign / domestic flow, one row per trading date per market scope.
--    Scope is a real dimension in the UI (Regular vs All Market), so it is a
--    row rather than a second set of columns.
--      REGULAR = txn_type 'RG'
--      ALL     = every txn_type (RG + NG today)
CREATE TABLE IF NOT EXISTS market_flow_daily (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date                date        NOT NULL,
    scope               varchar(8)  NOT NULL,

    -- Scope-level activity, summed from the same gross rows as the flows, so
    -- the percentages on screen reconcile with the flows beside them.
    total_value         bigint      NOT NULL,
    total_volume        bigint      NOT NULL,
    total_frequency     bigint      NOT NULL,

    foreign_buy_value   bigint      NOT NULL,
    foreign_sell_value  bigint      NOT NULL,
    foreign_net_value   bigint      NOT NULL,
    foreign_buy_volume  bigint      NOT NULL,
    foreign_sell_volume bigint      NOT NULL,
    foreign_net_volume  bigint      NOT NULL,

    domestic_buy_value  bigint      NOT NULL,
    domestic_sell_value bigint      NOT NULL,
    domestic_net_value  bigint      NOT NULL,

    source              varchar(40) NOT NULL DEFAULT 'derived:broker_summaries',
    ingested_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT market_flow_daily_scope_chk CHECK (scope IN ('REGULAR', 'ALL')),
    -- The identity that defines net; enforced so a bad aggregation cannot land.
    CONSTRAINT market_flow_daily_fnet_chk
      CHECK (foreign_net_value = foreign_buy_value - foreign_sell_value),
    CONSTRAINT market_flow_daily_fnetvol_chk
      CHECK (foreign_net_volume = foreign_buy_volume - foreign_sell_volume),
    CONSTRAINT market_flow_daily_dnet_chk
      CHECK (domestic_net_value = domestic_buy_value - domestic_sell_value),
    CONSTRAINT market_flow_daily_uniq UNIQUE (date, scope)
);

CREATE INDEX IF NOT EXISTS idx_market_flow_daily_date ON market_flow_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_market_flow_daily_scope_date ON market_flow_daily (scope, date DESC);
