-- Categories and view counts for the discussion board.
-- Hand-written rather than generated: a generated diff would also offer to drop
-- the market-data tables, which are outside the Prisma datamodel by design.
CREATE TYPE "DiscussionCategoryKind" AS ENUM (
  'MARKET_OUTLOOK', 'STOCK_DISCUSSION', 'MACRO_ECONOMY',
  'SECTOR_ANALYSIS', 'STRATEGY_PSYCHOLOGY'
);

ALTER TABLE "t_discussion_thread"
  ADD COLUMN "category" "DiscussionCategoryKind" NOT NULL DEFAULT 'MARKET_OUTLOOK',
  ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "t_discussion_thread_category_idx" ON "t_discussion_thread"("category");
