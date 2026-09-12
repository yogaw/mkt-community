-- Risk level and position size give way to a single risk/reward ratio.
-- Added nullable first so the existing rows can be backfilled from the levels
-- they already carry, then tightened to NOT NULL.
ALTER TABLE "t_signal" ADD COLUMN "risk_reward" VARCHAR(20);

UPDATE "t_signal"
SET "risk_reward" = '1:' || TRIM(TRAILING '.0' FROM TO_CHAR(
      ROUND(("target_1" - "entry_high")::numeric / NULLIF("entry_high" - "stop_loss", 0), 1),
      'FM999999990.0'))
WHERE "entry_high" > "stop_loss" AND "target_1" > "entry_high";

UPDATE "t_signal" SET "risk_reward" = '1:1' WHERE "risk_reward" IS NULL;

ALTER TABLE "t_signal" ALTER COLUMN "risk_reward" SET NOT NULL;

ALTER TABLE "t_signal" DROP COLUMN "position_size",
DROP COLUMN "risk_level",
ADD COLUMN     "chart_images" TEXT[];

-- DropEnum
DROP TYPE "SignalPositionSizeKind";

-- DropEnum
DROP TYPE "SignalRiskKind";

-- CreateTable
CREATE TABLE "t_stock" (
    "id" VARCHAR(30) NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_stock_ticker_key" ON "t_stock"("ticker");

-- CreateIndex
CREATE INDEX "t_stock_is_active_idx" ON "t_stock"("is_active");
