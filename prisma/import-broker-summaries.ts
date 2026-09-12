import "dotenv/config";
import { Client } from "pg";
import { type ImportSpec, bulkImportCsv, resolveCsvPath } from "./csv-bulk-import";

/**
 * Bulk-loads a broker_summaries CSV export into the partitioned table.
 *
 *   npm run import:broker-summaries                    # newest data/broker_summaries_*.csv
 *   npm run import:broker-summaries -- path/to.csv
 *
 * See csv-bulk-import.ts for how the load works and why re-runs are safe.
 * To re-import a day with corrected figures, delete that date first:
 *   DELETE FROM broker_summaries WHERE date = '2026-06-02';
 */
const SPEC: ImportSpec = {
  table: "broker_summaries",
  columns: [
    "id",
    "date",
    "ticker",
    "broker",
    "is_foreign",
    "action",
    "avg_px",
    "volume",
    "value",
    "is_net",
    "txn_type",
    "created_at",
    "frequency",
  ],
  conflictConstraint: "broker_summaries_uniq",
  filePattern: /^broker_summaries.*\.csv$/i,
};

async function main(): Promise<void> {
  const path = resolveCsvPath(SPEC, process.argv[2], "npm run import:broker-summaries -- path/to/export.csv");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const before = await client.query<{ count: string }>("SELECT count(*) FROM broker_summaries");
    console.log(`${Number(before.rows[0].count).toLocaleString()} rows already in broker_summaries`);

    const result = await bulkImportCsv(client, SPEC, path);

    const dates = await client.query<{ days: string; min: string; max: string }>(
      "SELECT count(DISTINCT date) AS days, min(date)::text AS min, max(date)::text AS max FROM broker_summaries",
    );
    const { days, min, max } = dates.rows[0];

    console.log(
      `\nDone. ${result.inserted.toLocaleString()} rows inserted, ` +
        `${result.skipped.toLocaleString()} skipped as already present.`,
    );
    console.log(`broker_summaries now covers ${days} trading days, ${min} → ${max}.`);
    console.log("\nNext: npm run import:stock-summaries (or fetch:stock-summaries to pull from IDX)");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
