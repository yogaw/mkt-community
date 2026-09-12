# IDX market data — fields, units and provenance

Everything here was measured against live IDX responses and the locally held
data on 2026-09-12, not taken from documentation. Re-verify with `--probe`
after any IDX-side change.

## Transport

All IDX calls go through `scripts/idx_fetch.py`. IDX's Cloudflare rule filters
on the TLS fingerprint, so Node and curl get 403 regardless of headers while a
real Chrome handshake gets 200. See `data/README.md` for the measurements.

## GetIndexSummary — `/primary/TradingSummary/GetIndexSummary`

Returns 45 indices per call; `IndexCode = "COMPOSITE"` is IHSG. A `date`
parameter (compact `YYYYMMDD`) **is** honoured, so the endpoint backfills;
omitted, it returns the most recent session.

Verified COMPOSITE record:

| Field | Example | Meaning | Unit |
| --- | --- | --- | --- |
| `Date` | `2026-09-11T00:00:00` | session date | — |
| `IndexCode` | `COMPOSITE` | IHSG | — |
| `Previous` | `6589.338` | prior session close | index points |
| `Highest` | `6552.792` | session high | index points |
| `Lowest` | `6462.96` | session low | index points |
| `Close` | `6541.377` | session close | index points |
| `Change` | `-47.961` | `Close - Previous` | index points |
| `Volume` | `28617128161` | all-market volume | **SHARES** |
| `Value` | `14712675309883` | all-market turnover | **IDR** |
| `Frequency` | `1916611` | all-market trade count | count |
| `NumberOfStock` | `918` | constituents | count |
| `MarketCapital` | `1.14464027920351e+16` | market cap | IDR, approximate |

**There is no `Open`.** IDX does not publish an opening level for an index
here, so `index_summaries` has no `open` column and the dashboard shows
High / Low / Prev Close instead. Filling it with `Previous` would be a
fabrication.

`Volume` is shares, not lots: `Value / Volume` = Rp 514.12, a plausible
market-wide average share price. At lots it would imply Rp 51,412.

`MarketCapital` arrives as a float around 1.1e16, past 2^53, so it is already
inexact on arrival. Stored as `numeric` to avoid rounding it twice.

### Weekends, holidays and partial days

A non-trading day simply has no data. The backfill never iterates the calendar:
it takes candidate dates from `broker_summaries`, which only has rows for days
that traded, so weekends and IDX holidays are never requested. Called without a
date the endpoint returns the last completed session, which is why the "latest"
API means *latest ingested trading day*, not `CURRENT_DATE` — on a Saturday
that is Friday.

Intraday behaviour on the current trading day was not characterised, because the
job is designed to run after close. Treat a same-day fetch as provisional.

## Foreign flow — derived, not fetched

**`stock_summaries.foreign_buy` / `foreign_sell` are SHARES, not rupiah.**
On 2026-09-11 BBCA shows `foreign_buy` 71,131,400 against `volume` 187,922,700
and `value` Rp 1.19T — a fraction of volume, six orders off the value. Deriving
a rupiah figure as `foreign_volume × close` would invent a number that was never
executed, and is done nowhere in this repository.

The executed rupiah figures come from `broker_summaries`, which carries the
broker's own `value` in IDR alongside `is_foreign`:

| Column | Meaning | Unit |
| --- | --- | --- |
| `is_foreign` | broker classified as foreign | bool |
| `action` | `BUY` / `SELL` | — |
| `value` | executed value | **IDR** |
| `volume` | executed volume | **LOTS** (×100 → shares) |
| `txn_type` | `RG` regular, `NG` negotiated | — |
| `is_net` | row is IDX's own net, not gross | bool |
| `frequency` | present but **unpopulated** (all 0) | — |

`volume` here is lots while `index_summaries` and `stock_summaries` are shares:
untouched, the broker rows imply Rp 50,911 per share; at ×100, Rp 509 against
the index's Rp 514. `build-market-flows.ts` converts at ingestion so every
volume column in the database means shares.

Only `is_net = false` rows are read. The gross rows sum to the same turnover on
each side; the net rows are IDX's own per-broker nets and would double-count.

### Scope

- `REGULAR` — `txn_type = 'RG'`
- `ALL` — every `txn_type` (RG + NG in the data so far)

Cross-check on 2026-09-11: RG + NG gross buy = Rp 14.72T against
`GetIndexSummary` `Value` = Rp 14.713T, a 0.04% difference.

### Regular-market frequency is not available

`broker_summaries.frequency` is entirely zero, and `stock_summaries.frequency`
counts trades across all boards rather than Regular alone. The dashboard shows
all-market frequency from IDX and states plainly that no Regular figure is
published, rather than repeating the all-market count in its place.

## Validation

`build-market-flows.ts` refuses to write a day that fails these:

1. `foreign_net + domestic_net === total_buy - total_sell`, exactly. Splitting
   one turnover two ways must account for all of it, including any imbalance
   IDX itself shipped. A deviation means an unclassified broker or a
   double-counted row.
2. Foreign buy and sell may not exceed the scope's own turnover.
3. Broker-derived all-market share volume must land within 50% of IDX's index
   volume. The two measure slightly different things — 1.99% average divergence
   across 71 days, worst 22.12% — so this is not a quality bar; it catches the
   lot convention changing, which would show as 9,900%.

The database enforces the net identities as CHECK constraints as well, so a
hand-written UPDATE cannot break them either.

`fetch-index-summary.ts` refuses a record with no `Close`, one where
`Highest < Lowest`, or one whose `Date` is not the day that was requested.

Observed but not fatal: IDX's own gross buy and sell totals do not always tie
out — 5 of 71 days differ by more than 0.1%, worst 0.53%. That is upstream and
is passed through rather than silently corrected.

## Commands

```bash
# IHSG, after close
npm run fetch:index-summary

# IHSG, historical
npm run fetch:index-summary -- --from 2026-06-01 --to 2026-09-12
npm run fetch:index-summary -- --probe            # inspect, write nothing

# foreign/domestic flow, derived locally from broker_summaries (no IDX calls)
npm run build:market-flows
npm run build:market-flows -- --from 2026-06-01 --to 2026-09-12
npm run build:market-flows -- --force             # rebuild stored dates
```

Both are idempotent: re-running a date updates its row rather than adding one.
Order matters only in that `build:market-flows` reads `index_summaries` for its
volume guard, so fetch first when doing both.

## Daily operation

After each close, in the same slot as the existing stock-summary job:

```bash
npm run fetch:stock-summaries   # existing
npm run fetch:index-summary     # IHSG for the day
npm run build:market-flows      # flows for any new broker dates
```

`build:market-flows` depends on `broker_summaries` for the day being loaded
first; it silently has nothing to do until then.

## API

| Route | Returns |
| --- | --- |
| `GET /api/v1/market/summary/latest` | latest ingested session |
| `GET /api/v1/market/summary/{date}` | one session; 404 if not a trading day |
| `GET /api/v1/market/foreign-flow?scope&days` | daily net flow + IHSG close |

All require a bearer token. The browser never calls idx.co.id.
