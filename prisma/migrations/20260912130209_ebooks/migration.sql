-- Creates the member document library.
--
-- The generator originally also emitted a DROP of market_flow_daily and of
-- eight index_summaries columns, because those live outside schema.prisma by
-- design. Removed: they are ingested market data, not application schema.
-- `npm run check:migrations` now refuses any migration that does this.

-- CreateEnum
CREATE TYPE "EbookTagKind" AS ENUM ('RESEARCH_REPORT', 'ARTICLE');

-- CreateTable
CREATE TABLE "t_ebook" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "tag" "EbookTagKind" NOT NULL,
    "summary" TEXT,
    "source" VARCHAR(150) NOT NULL,
    "author" VARCHAR(200),
    "tickers" TEXT[],
    "published_at" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(64) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_ebook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "t_ebook_published_at_idx" ON "t_ebook"("published_at");

-- CreateIndex
CREATE INDEX "t_ebook_tag_idx" ON "t_ebook"("tag");

