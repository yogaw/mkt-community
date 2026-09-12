-- CreateTable
CREATE TABLE "t_market_index_snapshot" (
    "id" VARCHAR(30) NOT NULL,
    "index_name" VARCHAR(20) NOT NULL DEFAULT 'IHSG',
    "value" DECIMAL(12,2) NOT NULL,
    "change_percent" DECIMAL(6,2) NOT NULL,
    "turnover_idr" DECIMAL(24,0) NOT NULL,
    "foreign_flow_idr" DECIMAL(24,0) NOT NULL,
    "advancers" INTEGER NOT NULL,
    "decliners" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_market_index_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "t_market_index_snapshot_captured_at_idx" ON "t_market_index_snapshot"("captured_at");

