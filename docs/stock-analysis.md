# Stock Analysis

Broker flow, profile and fundamentals for any IDX listing the ingestion covers.

## Routes

| Route | What it is |
| --- | --- |
| `/stock-analysis` | Discovery: search, Most Active, My Watchlist, Recently Viewed. |
| `/stock-analysis/[ticker]` | One stock. `?tab=broker\|profile\|fundamental`, default broker. |

Search term and tab both live in the query string, so a filtered view is a link
someone can send and a refresh lands where you were.

## Where the numbers come from

**Broker flow is real.** `broker_summaries` holds 4.4M rows across 958 tickers
and 88 brokers. Three conventions live in the repository and nowhere else:

- `is_net = false` rows are the gross buy and sell sides. The `is_net` rows are
  IDX's own netting and would double-count if mixed in.
- `volume` is in **lots** here, unlike `stock_summaries` which is in shares.
- `txn_type` is the board: `RG` regular, `NG` negotiated.

**Prices are real** — `stock_summaries` gives the close, day range, volume,
value, foreign buy/sell and shares outstanding, so market cap and free float are
computed rather than quoted.

**Fundamentals are not connected.** Nothing in this app reports company
financials. `SampleFundamentalsRepository` fills the interface for development,
deterministic per ticker, and the service **withholds it entirely when
`NODE_ENV === "production"`** — a fabricated revenue figure attached to a real
listed company is worse than an empty state. In development the tab carries a
red banner saying exactly that. Swapping in an `ApiFundamentalsRepository` later
means changing one export.

**Company facts are absent, not guessed.** Sector, listing date, website,
headquarters, description and shareholders have no source here, so the profile
names them as missing.

## Calculation

All of it in `broker-flow-math.ts`, free of I/O and covered by tests:

```
dailyNet[t]       = buyValue[t] - sellValue[t]
cumulativeNet[t]  = cumulativeNet[t-1] + dailyNet[t]     // dates ascending
netFlowRatio      = abs(netValue) / (totalBuy + totalSell)
avgPrice          = value / (lots * 100)                  // shares, not lots
concentration     = top-N share of Σ abs(brokerNet)
```

The flow threshold is **proportional, not nominal**: `lean` at 2% of the
period's own turnover and `strong` at 5%. A fixed rupiah figure would call the
same imbalance decisive on a small listing and invisible on BBCA.

Verified against independent SQL on real data (BBCA, 3 Aug – 11 Sep 2026):
totals exact to the rupiah, broker nets and daily nets both summing to the
market net, cumulative genuinely running (daily −26.77B, +3.51B, −50.69B →
cumulative −26.77B, −23.26B, −73.94B), top net buyer matching, and average buy
price inside the session's own high/low.

## Language

Broker flow is a proxy. The insight sentence is built from the aggregates — no
model is called — and a test asserts it never contains "institution",
"insider", "whale" or "smart money". A broker code says where a trade was
executed, not who placed it, and the tooltip on every flow card says so.

The price/flow quadrant is labelled "Flow interpretation — not a trading
signal" in the card and the tooltip.

## Layout

The information architecture follows the Stock Stalker reference: control card,
tabs, a four-card KPI strip, three insight cards, the cumulative chart with its
legend **above** the plot, then broker ranking and daily flow side by side, then
the detail table. The visual system stays Piranha's own — the brief was explicit
that the dark design was not to be copied, and the page renders in whichever
theme the member has chosen.

Broker Ranking is one list rather than separate buyer and seller columns. The
story of a period is usually a specific desk accumulating against a specific
desk selling, and two lists make that pairing something the reader has to
assemble.

## Colour is never the only signal

Every positive figure carries ▲ or "Buy", every negative one ▼ or "Sell".
Broker line colours are **hashed from the broker code**, not assigned by rank,
so a broker keeps its colour across the chart, legend, ranking, table and
tooltip — and keeps it when the period changes and the ranking reshuffles.

The palette is checked by measurement, not by eye. `broker-colors.test.ts`
computes WCAG contrast for every entry against both the light panel (#ffffff)
and the dark one (#15181a) and fails below 2.0:1 and 2.5:1 respectively. The
first palette was chosen against white alone and half of it vanished when the
theme flipped; the test caught two more entries (amber at 1.92:1, lime at
1.98:1 on white) before they shipped.

## Performance

Aggregation happens in Postgres. A quarter of BBCA is ~5,000 broker-day rows
out in ~100ms; the raw transaction rows never leave the database. The browser
receives daily aggregates, broker totals and summary metrics — never a trade.
Cumulative totals arrive already computed, so the chart and the table cannot
disagree.

## Integrations reused

- **Watchlist** — Piranha's watchlist holds *signals*, keyed to `signal_id`.
  Where a ticker has a signal, the button drives the existing
  `PUT/DELETE /api/v1/signals/[id]/watchlist`; where it does not, the header
  says so rather than offering a control that cannot work. **No second
  watchlist was created.** Making this work for all 958 tickers means widening
  the existing table to hold a ticker as well as a signal — a change to the
  Signals module, and a product decision rather than an implementation one.
- **Signals** — read from `t_signal`. Stock Analysis links to a signal and
  stores none.
- **Discussion** — matched on the thread's own `tickers` array.
- **Membership** — `auth-service` refuses login outright for a non-admin whose
  membership is not ACTIVE, so **every signed-in user is already a paying
  member**. There is no signed-in non-premium state to gate against, and a
  paywall preview would have meant inventing a second membership model. Stock
  Analysis is behind `requireAuth`, like Signals and Market Data.

## Still to come

- A fundamentals provider, behind `FundamentalsRepository`.
- A company registry for sector, industry and profile text.
- Broker names: `broker_summaries` publishes the code only, and
  `BrokerFlow.brokerName` stays null rather than carrying a guess.
- `t_stock` holds 62 of 958 tickers, so most rows show "Name not available".
  Importing the full IDX list fills this in with no code change.
- Ownership: not built, because nothing reports it.
