-- Discussion board: admin-authored threads, member comments with one level of
-- replies, reactions, and follows.
--
-- Hand-written per AGENTS.md. `prisma migrate diff --from-config-datasource`
-- compares against the live database and emits a DROP for every ingested
-- market-data table, so it is not used here. Every statement below touches
-- t_-prefixed tables only.

CREATE TYPE "DiscussionStatusKind" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CommentStatusKind" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "ReactionKind" AS ENUM ('LIKE');

-- ---------------------------------------------------------------- threads --
ALTER TABLE "t_discussion_thread"
  ADD COLUMN "slug"             VARCHAR(220),
  ADD COLUMN "excerpt"          VARCHAR(400),
  ADD COLUMN "status"           "DiscussionStatusKind" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "tags"             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tickers"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "thumbnail_url"    TEXT,
  ADD COLUMN "is_featured"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "comments_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "published_at"     TIMESTAMP(3);

-- Backfill before the NOT NULL constraints go on. Slugs come from the title,
-- with the row id appended so two threads sharing a title cannot collide.
UPDATE "t_discussion_thread"
SET "slug" = left(
      regexp_replace(
        regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'),
      200) || '-' || right("id", 6),
    "excerpt" = left(regexp_replace("body", '\s+', ' ', 'g'), 300),
    "published_at" = "created_at",
    -- The single ticker column becomes the first element of the array.
    "tickers" = CASE
      WHEN "ticker" IS NULL OR "ticker" = '' THEN ARRAY[]::TEXT[]
      ELSE ARRAY["ticker"]
    END;

ALTER TABLE "t_discussion_thread"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "excerpt" SET NOT NULL;

-- Superseded by "tickers"; the data moved in the UPDATE above.
DROP INDEX IF EXISTS "t_discussion_thread_ticker_idx";
ALTER TABLE "t_discussion_thread" DROP COLUMN "ticker";

CREATE UNIQUE INDEX "t_discussion_thread_slug_key" ON "t_discussion_thread"("slug");
CREATE INDEX "t_discussion_thread_status_published_at_idx"
  ON "t_discussion_thread"("status", "published_at");

-- --------------------------------------------------------------- comments --
ALTER TABLE "t_discussion_reply"
  ADD COLUMN "parent_id" VARCHAR(30),
  ADD COLUMN "status" "CommentStatusKind" NOT NULL DEFAULT 'VISIBLE';

ALTER TABLE "t_discussion_reply"
  ADD CONSTRAINT "t_discussion_reply_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "t_discussion_reply"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "t_discussion_reply_parent_id_idx" ON "t_discussion_reply"("parent_id");

-- -------------------------------------------------------------- reactions --
CREATE TABLE "t_discussion_reaction" (
  "id"         VARCHAR(30) NOT NULL,
  "thread_id"  VARCHAR(30) NOT NULL,
  "user_id"    VARCHAR(30) NOT NULL,
  "type"       "ReactionKind" NOT NULL DEFAULT 'LIKE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "t_discussion_reaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "t_discussion_reaction_user_id_thread_id_type_key"
  ON "t_discussion_reaction"("user_id", "thread_id", "type");
CREATE INDEX "t_discussion_reaction_thread_id_idx" ON "t_discussion_reaction"("thread_id");

ALTER TABLE "t_discussion_reaction"
  ADD CONSTRAINT "t_discussion_reaction_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "t_discussion_thread"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "t_discussion_reaction_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "t_user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "t_comment_reaction" (
  "id"         VARCHAR(30) NOT NULL,
  "reply_id"   VARCHAR(30) NOT NULL,
  "user_id"    VARCHAR(30) NOT NULL,
  "type"       "ReactionKind" NOT NULL DEFAULT 'LIKE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "t_comment_reaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "t_comment_reaction_user_id_reply_id_type_key"
  ON "t_comment_reaction"("user_id", "reply_id", "type");
CREATE INDEX "t_comment_reaction_reply_id_idx" ON "t_comment_reaction"("reply_id");

ALTER TABLE "t_comment_reaction"
  ADD CONSTRAINT "t_comment_reaction_reply_id_fkey"
  FOREIGN KEY ("reply_id") REFERENCES "t_discussion_reply"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "t_comment_reaction_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "t_user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------- follows --
CREATE TABLE "t_discussion_follow" (
  "id"         VARCHAR(30) NOT NULL,
  "thread_id"  VARCHAR(30) NOT NULL,
  "user_id"    VARCHAR(30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "t_discussion_follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "t_discussion_follow_user_id_thread_id_key"
  ON "t_discussion_follow"("user_id", "thread_id");
CREATE INDEX "t_discussion_follow_user_id_idx" ON "t_discussion_follow"("user_id");

ALTER TABLE "t_discussion_follow"
  ADD CONSTRAINT "t_discussion_follow_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "t_discussion_thread"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "t_discussion_follow_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "t_user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
