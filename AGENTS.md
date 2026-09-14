<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Migrations: never generate one that touches market data

Application tables are prefixed `t_` and Prisma owns them. Everything else —
`stock_summaries`, `broker_summaries` (range-partitioned, which Prisma cannot
express), `index_summaries`, `market_flow_daily` — is ingested market data that
lives outside `schema.prisma` on purpose.

`prisma migrate diff --from-config-datasource --to-schema` compares the live
database against the schema and emits a `DROP` for everything the schema does
not declare. On 2026-09-12 that silently removed `market_flow_daily` and eight
`index_summaries` columns. Recovering cost a full re-fetch from IDX.

So:

- Apply migrations with `npm run migrate`, not `prisma migrate deploy`. It runs
  `check:migrations` first, which refuses any migration dropping a non-`t_`
  table or column.
- Hand-write any migration that touches those tables.
- Read generated SQL **before** applying it, not after.
