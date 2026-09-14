-- CreateEnum
CREATE TYPE "SignalTypeKind" AS ENUM ('SWING', 'TRADING', 'POSITION');

-- CreateEnum
CREATE TYPE "SignalStatusKind" AS ENUM ('ACTIVE', 'TP1_HIT', 'TP2_HIT', 'STOP_LOSS', 'CLOSED');

-- CreateEnum
CREATE TYPE "SignalRiskKind" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SignalPositionSizeKind" AS ENUM ('SMALL', 'NORMAL', 'LARGE');

-- CreateEnum
CREATE TYPE "SignalEventKind" AS ENUM ('ENTRY', 'UPDATE', 'TARGET', 'STOP_LOSS');

-- CreateEnum
CREATE TYPE "SignalEventStateKind" AS ENUM ('DONE', 'PENDING', 'ACTIVE');

-- CreateTable
CREATE TABLE "t_signal" (
    "id" VARCHAR(30) NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "type" "SignalTypeKind" NOT NULL,
    "entry_low" INTEGER NOT NULL,
    "entry_high" INTEGER NOT NULL,
    "current_price" INTEGER NOT NULL,
    "target_1" INTEGER NOT NULL,
    "target_2" INTEGER,
    "stop_loss" INTEGER NOT NULL,
    "status" "SignalStatusKind" NOT NULL DEFAULT 'ACTIVE',
    "risk_level" "SignalRiskKind" NOT NULL,
    "position_size" "SignalPositionSizeKind" NOT NULL,
    "time_horizon" VARCHAR(50) NOT NULL,
    "thesis" TEXT NOT NULL,
    "key_catalysts" TEXT[],
    "issued_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_signal_event" (
    "id" VARCHAR(30) NOT NULL,
    "signal_id" VARCHAR(30) NOT NULL,
    "kind" "SignalEventKind" NOT NULL,
    "state" "SignalEventStateKind" NOT NULL DEFAULT 'DONE',
    "title" VARCHAR(150) NOT NULL,
    "detail" TEXT,
    "occurred_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_signal_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_signal_watchlist_item" (
    "id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "signal_id" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_signal_watchlist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "t_signal_status_idx" ON "t_signal"("status");

-- CreateIndex
CREATE INDEX "t_signal_issued_at_idx" ON "t_signal"("issued_at");

-- CreateIndex
CREATE INDEX "t_signal_ticker_idx" ON "t_signal"("ticker");

-- CreateIndex
CREATE INDEX "t_signal_event_signal_id_sort_order_idx" ON "t_signal_event"("signal_id", "sort_order");

-- CreateIndex
CREATE INDEX "t_signal_watchlist_item_user_id_idx" ON "t_signal_watchlist_item"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_signal_watchlist_item_user_id_signal_id_key" ON "t_signal_watchlist_item"("user_id", "signal_id");

-- AddForeignKey
ALTER TABLE "t_signal_event" ADD CONSTRAINT "t_signal_event_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "t_signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_signal_watchlist_item" ADD CONSTRAINT "t_signal_watchlist_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_signal_watchlist_item" ADD CONSTRAINT "t_signal_watchlist_item_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "t_signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
