-- Restores what the generated ebooks migration dropped.
--
-- WHY IT WAS DROPPED, so it does not happen again:
--   `prisma migrate diff --from-config-datasource --to-schema` compares the live
--   database against schema.prisma and emits a DROP for anything it finds that
--   the schema does not declare. market_flow_daily and the widened
--   index_summaries columns were created by a hand-written migration and are
--   deliberately absent from schema.prisma, so the generator removed them.
--
--   Market-data tables are NOT in the Prisma datamodel by design — broker_summaries
--   is range-partitioned, which Prisma cannot express. So migrations touching any
--   non-`t_`-prefixed table MUST be hand-written. Do not generate them.

ALTER TABLE index_summaries
  ADD COLUMN IF NOT EXISTS previous        numeric(15,3),
  ADD COLUMN IF NOT EXISTS high            numeric(15,3),
  ADD COLUMN IF NOT EXISTS low             numeric(15,3),
  ADD COLUMN IF NOT EXISTS change          numeric(15,3),
  ADD COLUMN IF NOT EXISTS frequency       bigint,
  ADD COLUMN IF NOT EXISTS number_of_stock integer,
  ADD COLUMN IF NOT EXISTS source          varchar(40) NOT NULL DEFAULT 'idx:GetIndexSummary',
  ADD COLUMN IF NOT EXISTS ingested_at     timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS market_flow_daily (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date                date        NOT NULL,
    scope               varchar(8)  NOT NULL,

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
