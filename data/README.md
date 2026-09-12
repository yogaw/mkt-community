# data/

Bulk market-data files live here and are **not** committed — see the `/data/*`
rule in `.gitignore`. Only this README and `.gitkeep` are tracked, so the folder
survives a fresh clone while the payloads (hundreds of MB) stay local.

## Expected contents

| File | Produced by | Consumed by |
| --- | --- | --- |
| `broker_summaries_*.csv` | Export from the upstream market-data project | `npm run import:broker-summaries` |
| `stock_summaries_*.csv` | Export from the upstream market-data project | `npm run import:stock-summaries` |

## Pipeline

```bash
# 1. load the broker CSV (partitioned table, resumable, idempotent)
npm run import:broker-summaries

# 2a. load the matching stock CSV, if you have the export
npm run import:stock-summaries

# 2b. or pull the same data from IDX, one day per request, for dates 2a missed
npm run fetch:stock-summaries
```

Prefer the export when you have one: it is a single pass instead of ~71
rate-limited requests. The fetcher is for topping up days the export predates.

```bash
# 3. after each close, store that day's COMPOSITE (IHSG) figures
npm run fetch:index-summary

# 4. derive market-level foreign/domestic flow from the broker rows (local only)
npm run build:market-flows
```

Step 3 also backfills: `-- --from 2026-06-01 --to 2026-09-12`. Step 4 makes no
IDX requests at all — it aggregates `broker_summaries` — so it is cheap to
re-run. Field meanings and units for both are in `docs/idx-market-data.md`.

Steps 2b and 3 need the setup below.

## NULL vs 0

The two are not interchangeable, and the convention is load-bearing:

- **Price columns** — `previous_close`, `open_price`, `high`, `low`, `change`,
  `bid`, `offer` — store **NULL** when IDX reports 0. A price of zero is not a
  price; it means there was no open, no quote, no trade.
- **Quantity columns** — `volume`, `value`, `frequency`, `bid_volume`,
  `offer_volume`, `foreign_buy`, `foreign_sell` — store **0**, which is a real
  measurement.
- `close` is NOT NULL and is always a real price in the data.

Across the 71 backfilled days the price columns hold thousands of NULLs and not
one 0, and the quantity columns the exact reverse. The fetcher applies the same
rule, verified by replaying a captured IDX payload and diffing against the
export: 959 rows x 19 columns, byte-identical. Keep it that way — a day written
under the other convention would silently skew any `AVG` or `IS NULL` over
prices.

## IDX transport setup

The fetch goes out through `scripts/idx_fetch.py`, not Node. IDX's Cloudflare
rule filters on the **TLS fingerprint**, and Node's OpenSSL stack cannot produce
a browser one at any header or cipher setting. Measured from one host, same IP:

| Client | Result |
| --- | --- |
| Node `fetch` / `https`, incl. Chrome cipher + curve tuning | 403 |
| `curl`, HTTP/1.1 or /2, any headers, even no User-Agent | 403 |
| Real Chrome TLS handshake (`curl_cffi`) | **200** |

Headers barely matter: `Accept` alone succeeds, and a deliberately bogus
`Referer` still succeeds. The handshake is the whole gate.

```bash
python3 -m venv scripts/.venv
scripts/.venv/bin/pip install -r scripts/requirements.txt
```

The venv is gitignored. Override the interpreter with `IDX_PYTHON` if you keep
it elsewhere.

## Useful flags

```bash
npm run fetch:stock-summaries -- --probe 2026-09-11   # one request, writes nothing
npm run fetch:stock-summaries -- --from 2026-06-02 --to 2026-06-30
npm run fetch:stock-summaries -- --force              # refetch dates already stored
npm run fetch:index-summary -- --probe                # latest COMPOSITE, writes nothing
```

`--probe` prints the raw record beside the mapped columns and states whether IDX
honoured the requested date — run it first after any IDX-side change.

## Operational notes

- Every request waits a random 2–4s first, including the first one. Fixed
  intervals are themselves a bot signal.
- Dates are fetched sequentially. Do not parallelise.
- **A 403 is never retried.** In practice it is rate-based — IDX answers a
  burst with a block rather than a 429 — and repeated attempts extend it. The
  run aborts instead. Wait, then re-run: stored dates are skipped, so it
  resumes where it stopped.
- A 429 is an ordinary rate limit and *is* retried with backoff.
- `IDX_COOKIE` is injected if set. Not currently needed, but the endpoint has
  wanted a clearance cookie in the past.
- `IDX_BASE_URL` overrides the API root (`.../primary/TradingSummary`); the
  endpoint name is appended to it.

## index_summaries

`fetch:index-summary` calls GetIndexSummary without a date, which returns the
most recent session — so it is an after-close job, not a backfill. Of the 45
indices returned only COMPOSITE is kept, and of its 14 fields only `date`,
`close`, `volume`, `value` and `market_capital`. Re-running on the same day
updates that day's row rather than adding one.

`market_capital` is `numeric`, not `bigint`: IDX serialises it as a float around
1.1e16, above the 2^53 point where float64 stops being exact, so the value is
already approximate when it arrives. Storing it as numeric avoids rounding it
again. Widening this to other indices means adding an `index_code` column and
making the unique key `(date, index_code)`.


## Migrations near this data

`market_flow_daily` and the widened `index_summaries` columns are not in
`schema.prisma`, so a generated Prisma migration will try to drop them. Apply
migrations with `npm run migrate` — it refuses destructive changes to any
non-`t_` table first. Hand-write anything that touches these tables.
