import "dotenv/config";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

/**
 * Fetches the latest COMPOSITE (IHSG) figures from IDX and upserts one row.
 *
 *   npm run fetch:index-summary            # store the latest session
 *   npm run fetch:index-summary -- --probe # print it, write nothing
 *
 * IDX returns 45 indices; only COMPOSITE is kept, and only the five fields we
 * use. The endpoint is called without a date, which asks for the most recent
 * session — so this is a "run it after close" job, not a backfill. Re-running
 * the same day overwrites that day's row rather than adding one.
 *
 * Goes through scripts/idx_fetch.py for the same reason the stock fetcher does:
 * IDX filters on TLS fingerprint and Node cannot forge one. Setup:
 *   python3 -m venv scripts/.venv
 *   scripts/.venv/bin/pip install -r scripts/requirements.txt
 */

const FETCH_SCRIPT = join("scripts", "idx_fetch.py");
const INDEX_CODE = "COMPOSITE";

/** Exit codes from idx_fetch.py. */
const EXIT_BLOCKED = 3;

function resolvePython(): string {
  if (process.env.IDX_PYTHON) {
    return process.env.IDX_PYTHON;
  }
  const venv = join("scripts", ".venv", "bin", "python");
  return existsSync(venv) ? venv : "python3";
}

/** IDX sends numbers as numbers, as strings, and occasionally as "" or "-". */
function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "" || raw === "-") {
    return null;
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/**
 * MarketCapital arrives around 1.1e16, past Number.MAX_SAFE_INTEGER, so the
 * float64 IDX sent is already approximate. Render it in full decimal rather
 * than letting exponential notation reach the numeric column.
 */
function toNumericLiteral(raw: unknown): string | null {
  const value = toNumber(raw);
  return value === null ? null : BigInt(Math.round(value)).toString();
}

async function fetchLatest(): Promise<Record<string, unknown>[]> {
  try {
    const { stdout } = await execFileAsync(resolvePython(), [FETCH_SCRIPT, "index-summary"], {
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
    return JSON.parse(stdout) as Record<string, unknown>[];
  } catch (error) {
    const failure = error as { code?: number; stderr?: string; message?: string };
    if (failure.code === EXIT_BLOCKED) {
      throw new Error(
        "IDX returned 403. Usually rate-based: too many requests in a short window. " +
          "Wait before re-running — repeated 403s extend it.",
      );
    }
    throw new Error((failure.stderr ?? failure.message ?? "").trim() || "fetch failed");
  }
}

async function main(): Promise<void> {
  const probe = process.argv.includes("--probe");

  const records = await fetchLatest();
  const composite = records.find((record) => record.IndexCode === INDEX_CODE);

  if (!composite) {
    const codes = records.map((record) => record.IndexCode).filter(Boolean);
    console.error(
      `No ${INDEX_CODE} row in the response (${records.length} indices: ${codes.slice(0, 8).join(", ")}…).`,
    );
    process.exit(1);
  }

  const date = /^(\d{4}-\d{2}-\d{2})/.exec(String(composite.Date ?? ""))?.[1];
  if (!date) {
    console.error(`${INDEX_CODE} row has no usable Date: ${JSON.stringify(composite.Date)}`);
    process.exit(1);
  }

  const row = {
    date,
    close: toNumber(composite.Close),
    volume: toNumber(composite.Volume),
    value: toNumber(composite.Value),
    marketCapital: toNumericLiteral(composite.MarketCapital),
  };

  if (row.close === null) {
    console.error(`${INDEX_CODE} row for ${date} has no Close; refusing to write.`);
    process.exit(1);
  }

  if (probe) {
    console.log(`${records.length} indices returned; ${INDEX_CODE} raw:\n`);
    console.log(JSON.stringify(composite, null, 2));
    console.log("\nMapped:\n");
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const before = await client.query("SELECT 1 FROM index_summaries WHERE date = $1", [date]);

    await client.query(
      `INSERT INTO index_summaries (date, close, volume, value, market_capital)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT uq_index_summary_date
       DO UPDATE SET close = EXCLUDED.close, volume = EXCLUDED.volume,
                     value = EXCLUDED.value, market_capital = EXCLUDED.market_capital,
                     updated_at = now()`,
      [row.date, row.close, row.volume, row.value, row.marketCapital],
    );

    console.log(
      `${(before.rowCount ?? 0) > 0 ? "Updated" : "Stored"} ${INDEX_CODE} for ${date}: ` +
        `close ${row.close}, volume ${row.volume?.toLocaleString()}, ` +
        `value ${row.value?.toLocaleString()}, market cap ${row.marketCapital}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
