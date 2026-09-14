# Discussion board

A curated research board, not an open forum. **Only admins open a discussion**;
members comment, reply, like and follow.

## Routes

| Route | What it is |
| --- | --- |
| `/discussion` | The board. Search, category and sort live in the query string. |
| `/discussion/[id]` | One thread, its comments and its related threads. |
| `/discussion/new` | The admin editor. |
| `/discussion/[id]/edit` | The same editor, loaded with an existing thread. |
| `/discussion/guidelines` | The long form of the sidebar rules card. |

`[id]` resolves an id **or** a slug, so links can move to readable URLs later
without a data migration. `toSlug` refuses `new`, `edit`, `guidelines` and
`contributors` so a thread cannot shadow a page.

## The permission rule

`POST /api/v1/discussions` is behind `requireAdmin`, and the service re-checks
`viewer.isAdmin` before the write — hiding the button is the courtesy, the 403
is the rule. Verified against the running app:

| Caller | POST /api/v1/discussions | PATCH | DELETE |
| --- | --- | --- | --- |
| anonymous | 401 | 401 | 401 |
| member | **403** | **403** | **403** |
| admin | 201 | 200 | 200 |

Drafts are admin-only everywhere: absent from a member's listing, 404 on direct
access, and 404 when commenting.

Members may delete their own comment; admins may delete any. Hiding a comment
keeps the row — a reply chain would otherwise lose its middle — and withholds
only the text, which admins still see.

## Comment depth

One level. `resolveParent` hangs a reply-to-a-reply off the same parent as the
comment it answers, so a thread cannot indent itself into a column two words
wide. This is enforced server-side, not trusted from the client.

## Content

`discussion-content.ts` parses a small markdown subset — headings, bullet and
numbered lists, quotes, images, `**bold**`, `*italic*`, `[links](…)` and
`$TICKER` — into typed blocks that render as React elements. No
`dangerouslySetInnerHTML` anywhere on the path, so a body can never inject
markup whoever wrote it, and `isSafeHref` keeps `javascript:` and `data:` out of
links: "trusted author" is not a reason to let a compromised admin session
become script execution in every reader's browser.

A full markdown library was not worth several hundred kilobytes plus an HTML
sanitiser for six constructs. The editor writes the same subset through a
toolbar, so what is stored is plain text all the way to the database.

## Views

`view_count` counts opens, not unique readers. The increment is **raw SQL**
because `updatedAt` drives the "Recently Updated" sort and Prisma's `@updatedAt`
fires on every `update()` — passing `updatedAt: undefined` does not opt out.
Measured before the fix: opening an old thread floated it above genuinely active
ones. The counter is also fire-and-forget; a broken counter must not cost the
reader the thread they asked for.

## Ranking

Top Contributors ranks by **comments written**. On a board where only admins
start threads, comments are the whole of member participation, so they are the
only honest thing to rank by. No points, no badges, no levels.

## What is deliberately absent

- **Notifications.** The app has none. Follow state is stored and surfaced, and
  `PUT/DELETE /api/v1/discussions/[id]/follow` is the boundary a future system
  would read — not a parallel one built alongside it.
- **Ticker links.** There is no stock detail route yet, so `TickerBadge` renders
  a badge. When that route exists it is the one component to change.
- **Per-user unread state.** Nothing tracks what a member has opened. The feed's
  "New" badge marks threads published in the last 72 hours and is named for what
  it actually is.
- **Reposting, quoting, follower graphs.** They turn a research board into a
  feed.

## Tags and tickers

`String[]` columns, not join tables — matching `Signal.keyCatalysts` and
`Ebook.tickers`, which the schema already justifies as "display-only text, so
kept inline rather than in its own table". Neither has an attribute of its own
or an independent lifecycle. Search matches them with `has`, so a search for
"ADRO" or "Commodities" finds the thread that is about it even when the word
never appears in the prose.

## Seeding

`npm run seed:discussion` reseeds the board: seven admin-authored threads across
the five categories, twenty comments including nested replies, plus reactions
and a follow so those states are exercised rather than only written.
