import "dotenv/config";
import { Client } from "pg";
import { type ImportSpec, bulkImportCsv, resolveCsvPath } from "./csv-bulk-import";

/**
 * Bulk-loads a stock_summaries CSV export.
 *
 *   npm run import:stock-summaries                    # newest data/stock_summaries_*.csv
 *   npm run import:stock-summaries -- path/to.csv
 *
 * The alternative to this is fetch:stock-summaries, which pulls the same data
 * from IDX a day at a time. Use the export when you have one — it is one pass
 * instead of 71 rate-limited requests.
 *
 * See csv-bulk-import.ts for how the load works and why re-runs are safe.
 * To re-import a day with corrected figures, delete that date first:
 *   DELETE FROM stock_summaries WHERE date = '2026-06-02';
 */
const SPEC: ImportSpec = {
  table: "stock_summaries",
  columns: [
    "id",
    "date",
    "ticker",
    "previous_close",
    "open_price",
    "high",
    "low",
    "close",
    "change",
    "volume",
    "value",
    "frequency",
    "foreign_sell",
    "foreign_buy",
    "listed_shares",
    "tradeable_shares",
    "bid",
    "bid_volume",
    "offer",
    "offer_volume",
    "created_at",
    "updated_at",
  ],
  conflictConstraint: "uq_stock_summary_date_ticker",
  // stock_summaries.id is GENERATED ALWAYS, unlike broker_summaries.
  overridingSystemValue: true,
  filePattern: /^stock_summaries.*\.csv$/i,
};

async function main(): Promise<void> {
  const path = resolveCsvPath(SPEC, process.argv[2], "npm run import:stock-summaries -- path/to/export.csv");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const before = await client.query<{ count: string }>("SELECT count(*) FROM stock_summaries");
    console.log(`${Number(before.rows[0].count).toLocaleString()} rows already in stock_summaries`);

    const result = await bulkImportCsv(client, SPEC, path);

    // The two tables are only useful together, so report the gap rather than
    // leaving it to be discovered by a join that quietly returns nothing.
    const coverage = await client.query<{ days: string; min: string; max: string; missing: string }>(
      `SELECT count(DISTINCT date) AS days, min(date)::text AS min, max(date)::text AS max,
              (SELECT count(DISTINCT b.date) FROM broker_summaries b
               WHERE NOT EXISTS (SELECT 1 FROM stock_summaries s WHERE s.date = b.date)) AS missing
       FROM stock_summaries`,
    );
    const { days, min, max, missing } = coverage.rows[0];

    console.log(
      `\nDone. ${result.inserted.toLocaleString()} rows inserted, ` +
        `${result.skipped.toLocaleString()} skipped as already present.`,
    );
    console.log(`stock_summaries now covers ${days} trading days, ${min} → ${max}.`);
    console.log(
      Number(missing) === 0
        ? "Every broker_summaries date has stock summaries."
        : `${missing} broker_summaries date(s) still have no stock summaries — npm run fetch:stock-summaries`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
