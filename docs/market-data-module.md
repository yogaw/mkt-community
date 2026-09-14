# Market Data module

Three sections — Global Market, Indonesia Market, Commodities — at
`/market-data/global`, `/market-data/indonesia`, `/market-data/commodities`.
`/market-data` redirects to `global`, so the sidebar link keeps working and the
prefix match still highlights.

They are one dynamic route, `app/(member)/market-data/[section]/page.tsx`,
prerendered from `generateStaticParams`. The section tabs are `<Link>`s, which
makes each section a real URL — bookmarkable, shareable, survives a refresh —
while switching between them stays a client transition rather than an app
reload.

## The shape everything is reduced to

`market-data-model.ts` defines `Instrument`. Presentation only ever sees that
shape, whatever is behind it. Beyond the price fields it carries:

| field | why it exists |
| --- | --- |
| `source` | who published the number, so a reader can judge it |
| `dataStatus` | `LIVE` / `DELAYED` / `END_OF_DAY` / `OFFICIAL_RELEASE` / `SAMPLE` |
| `delayMinutes` | stated rather than implied, when a feed is delayed |
| `timestamp` | the date of the observation, not of the request |
| `benchmark` | which contract or index the number refers to |
| `unit`, `currency`, `decimals` | US$ per barrel is not US$ per tonne |
| `invertTone` | a rising VIX, yield or dollar is not good news |
| `preferBasisPoints` | a 6bp move on a 4.97% yield is not "+1.21%" |

## Two catalogues, joined by `code`

`src/features/market-data/catalogue/instruments.ts` says what a member sees and
how to read it. `prisma/indicator-sources.ts` says where a row in
`market_indicator_point` comes from. They are separate because they answer
different questions and change for different reasons; they meet at `code`, and
`instruments.test.ts` fails the build if a displayed instrument has no source
behind it. Without that test a typo would just make an instrument vanish.

## Sample data never reaches production

An instrument whose `feed` is `sample` gets a deterministic generated series
(seeded from its symbol, weekdays only, anchored to the freshest real
observation). `isVisibleInEnvironment` drops every one of them when
`NODE_ENV === "production"`.

They are **excluded, not badged**. A generated price shown to a paying member
is a fabricated price whatever label sits beside it. In development they are
visible and marked "Sample data" in red, with a line saying the feed is not
connected. `instruments.test.ts` asserts that `dataStatus === "SAMPLE"` and
`feed.kind === "sample"` never disagree, and that each section's default
instrument is one that survives production.

What is currently sample-backed, and why, is listed in `UNAVAILABLE_SERIES` in
`prisma/indicator-sources.ts`.

## Staleness

Two independent guards:

- **Service** (`STALE_AFTER_DAYS = 10`): a series more than ten days behind the
  freshest observation is dropped entirely. A vendor contract can stop updating
  while still answering — the API2 coal series did exactly that.
- **UI** (`STALE_AFTER_DAYS = 3`): a warning above the chart. The threshold is
  three days, not "older than the freshest", because venues close on different
  calendars — crypto prints on a Sunday and IDX does not. The reference is
  computed from connected feeds only, so generated data can never make real
  data look stale.

## Timeframes

1M, 3M, 1Y and ALL are available. 1D, 1W and 5Y are shown disabled rather than
hidden: the stored series is a daily close, so 1D would plot a single point and
5Y would need history we do not keep. Drawing either and calling it a chart
would be a lie told in pixels.

## Market Insight

Static editorial copy per section, in `market-insight-card.tsx`, with a line on
the card saying so. It is explicitly **not** generated — there is no editorial
backend yet, and commentary that reads as analysis should not be synthesised
without one.

## Browser never talks to a vendor

One endpoint, `GET /api/v1/market-data?section=…`, behind `requireAuth`. Which
provider sits behind a given instrument is decided server-side, so the frontend
never learns one exists.

## Watchlists

Not wired up, deliberately. The existing watchlist is `SignalWatchlistItem`,
which belongs to Signals and is keyed to a signal, not an instrument. Reusing
it would mean bending it out of shape; adding another would mean two watchlist
systems. The explore panel states the boundary instead of hiding it.
