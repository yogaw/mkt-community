-- CreateEnum
CREATE TYPE "IdxDisclosureKind" AS ENUM ('RUPS', 'DIVIDEND', 'MATERIAL_TRANSACTION', 'FINANCIAL_REPORT', 'SHARE_BUYBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarEventKind" AS ENUM ('EARNINGS', 'DIVIDEND_EX_DATE', 'DIVIDEND_PAYMENT', 'RUPS', 'IPO_LISTING', 'MACRO', 'OTHER');

-- CreateTable
CREATE TABLE "t_idx_disclosure" (
    "id" VARCHAR(30) NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "kind" "IdxDisclosureKind" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "summary" TEXT,
    "document_url" TEXT,
    "disclosed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_idx_disclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_calendar_event" (
    "id" VARCHAR(30) NOT NULL,
    "ticker" VARCHAR(10),
    "title" VARCHAR(200) NOT NULL,
    "kind" "CalendarEventKind" NOT NULL,
    "detail" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_discussion_thread" (
    "id" VARCHAR(30) NOT NULL,
    "author_id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "ticker" VARCHAR(10),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_discussion_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_discussion_reply" (
    "id" VARCHAR(30) NOT NULL,
    "thread_id" VARCHAR(30) NOT NULL,
    "author_id" VARCHAR(30) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_discussion_reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "t_idx_disclosure_disclosed_at_idx" ON "t_idx_disclosure"("disclosed_at");

-- CreateIndex
CREATE INDEX "t_idx_disclosure_ticker_idx" ON "t_idx_disclosure"("ticker");

-- CreateIndex
CREATE INDEX "t_calendar_event_event_date_idx" ON "t_calendar_event"("event_date");

-- CreateIndex
CREATE INDEX "t_discussion_thread_is_pinned_created_at_idx" ON "t_discussion_thread"("is_pinned", "created_at");

-- CreateIndex
CREATE INDEX "t_discussion_thread_ticker_idx" ON "t_discussion_thread"("ticker");

-- CreateIndex
CREATE INDEX "t_discussion_reply_thread_id_created_at_idx" ON "t_discussion_reply"("thread_id", "created_at");

-- AddForeignKey
ALTER TABLE "t_discussion_thread" ADD CONSTRAINT "t_discussion_thread_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "t_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_discussion_reply" ADD CONSTRAINT "t_discussion_reply_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "t_discussion_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_discussion_reply" ADD CONSTRAINT "t_discussion_reply_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "t_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

