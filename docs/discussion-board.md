# Discussion board

`/discussion`. One page: a row of category cards, the thread list, and a rail
carrying the house rules and the top contributors.

## Categories

Five, fixed, from the `DiscussionCategoryKind` enum: Market Outlook, Stock
Discussion, Macro Economy, Sector Analysis, Strategy & Psychology.

The cards are built from the enum rather than from what happens to be in the
table, so an empty room still shows as a room. Selecting a card filters the
list; selecting it again clears the filter, which is why there is no separate
"All" control competing with the five.

Each category owns one of the theme's categorical colours, reused by the card,
the chip on a thread row and the row's thumbnail, so a reader learns a colour
once. The thumbnails are the category marks rather than photographs: the design
they come from used stock imagery there, which would mean shipping pictures
nobody chose for the thread or building an upload path the board has not asked
for.

## Views

`view_count` counts opens, not unique readers — the schema says so out loud so
nothing comes to depend on it being exact. It is incremented by
`GET /api/v1/discussions/[id]`, which is the thing a view is.

**The increment is raw SQL on purpose.** `updatedAt` drives the "recently
active" sort, and Prisma's `@updatedAt` fires on every `update()` the client
makes; passing `updatedAt: undefined` does not opt out. Measured before the
fix: opening an old thread floated it above genuinely active ones. Moving one
column and leaving the other alone needs SQL.

The counter is also fire-and-forget. A failure there must not cost the reader
the thread they asked for, so the read returns either way and the figure shown
is the pre-read one.

## Top contributors

Ranked by **replies written**, not threads started. Someone who answers other
people's questions is holding the board up; someone who only posts their own is
not, and counting threads would rank them the same.

## One request, not two

`GET /api/v1/discussions` returns the thread page *and* the overview — the
category counts and the contributor ranking. The board renders them together,
and two round trips would let the counts disagree with the rows beneath them.

## Community rules

Static copy in `community-rules.tsx`. They change rarely, and a rule that can be
edited without anyone noticing is not much of a rule. "Read full guidelines"
opens the pinned house-rules thread.

**One rule from the design is deliberately not shipped.** The mockup listed
"Only discussions started by admin". Any member can start a thread today, and
`POST /api/v1/discussions` allows it, so printing that rule would have stated
something the app does not do. Enforcing it instead would disable the board's
main member action off the back of a line of mockup copy. If admin-only threads
are wanted, `POST /api/v1/discussions` needs `requireAdmin` and the rule goes
back in the list.

## Seeding

`npm run seed:discussion` reseeds only the board — ten threads across the five
categories, eighteen replies, and seeded view counts. Replies are rebuilt each
run so they never accumulate.
