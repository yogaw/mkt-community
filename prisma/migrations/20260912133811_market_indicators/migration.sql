-- Daily history for the macro / commodity indicators on the Market Data page.
-- Hand-written: this is ingested market data, outside the Prisma datamodel like
-- its neighbours, and a generated migration would offer to drop it.
--
-- UNITS are per indicator and declared in the catalogue in code
-- (src/features/market-data/indicator-catalogue.ts), not here: a close is
-- points for an index, percent for a yield, USD for a commodity, IDR for a
-- rate. Storing them in one column is fine; interpreting them is the
-- catalogue's job.
CREATE TABLE IF NOT EXISTS market_indicator_point (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol      varchar(20)    NOT NULL,
    date        date           NOT NULL,
    open        numeric(20,6),
    high        numeric(20,6),
    low         numeric(20,6),
    close       numeric(20,6)  NOT NULL,
    volume      bigint,
    source      varchar(20)    NOT NULL,
    ingested_at timestamptz    NOT NULL DEFAULT now(),
    updated_at  timestamptz    NOT NULL DEFAULT now(),

    CONSTRAINT market_indicator_point_uniq UNIQUE (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_market_indicator_symbol_date
  ON market_indicator_point (symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_market_indicator_date
  ON market_indicator_point (date DESC);
