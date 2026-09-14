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
 *   npm run fetch:index-summary                                  # latest session
 *   npm run fetch:index-summary -- --probe                       # print it, write nothing
 *   npm run fetch:index-summary -- --from 2026-06-01 --to 2026-09-12
 *   npm run fetch:index-summary -- --from 2026-06-01 --force     # refetch stored dates
 *
 * IDX returns 45 indices; only COMPOSITE is kept. Called without a date it
 * returns the most recent session, which is the after-close job. Given a range
 * it backfills, one request per trading day.
 *
 * WHICH DAYS GET REQUESTED
 * The trading calendar comes from broker_summaries, not from iterating dates:
 * a day the market was shut has no broker rows, so it is never requested. That
 * removes weekends and IDX holidays without hard-coding either, and it means a
 * range wider than the broker data simply fetches what is known to exist.
 *
 * FIELDS
 * GetIndexSummary publishes no Open for an index, so index_summaries has no
 * open column. Everything else in the COMPOSITE record is stored. Re-running a
 * date updates that row rather than adding one.
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
const EXIT_RATE_LIMITED = 4;

/** Same cadence as the stock fetcher: jittered, sequential, never parallel. */
const DELAY_MIN_MS = 2000;
const DELAY_MAX_MS = 4000;
const MAX_ATTEMPTS = 3;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** One request. `date` omitted asks IDX for the most recent session. */
async function fetchRecords(date?: string): Promise<Record<string, unknown>[]> {
  const args = date ? [FETCH_SCRIPT, "index-summary", date] : [FETCH_SCRIPT, "index-summary"];
  let lastError = "fetch failed";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // Wait before every request, the first included: a fixed cadence is itself
    // a bot signal.
    await sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
    try {
      const { stdout } = await execFileAsync(resolvePython(), args, {
        maxBuffer: 8 * 1024 * 1024,
        env: process.env,
      });
      return JSON.parse(stdout) as Record<string, unknown>[];
    } catch (error) {
      const failure = error as { code?: number; stderr?: string; message?: string };
      if (failure.code === EXIT_BLOCKED) {
        // Never retried: in practice the block is rate-based and retrying
        // extends it. Abort so a resume can pick up where this stopped.
        throw new Error(
          "IDX returned 403. Usually rate-based: too many requests in a short window. " +
            "Wait before re-running — stored dates are skipped, so it resumes.",
        );
      }
      lastError = (failure.stderr ?? failure.message ?? "").trim() || lastError;
      if (failure.code !== EXIT_RATE_LIMITED && attempt === MAX_ATTEMPTS - 1) {
        break;
      }
      await sleep(DELAY_MAX_MS * 2 ** attempt);
    }
  }

  throw new Error(lastError);
}

interface Options {
  from?: string;
  to?: string;
  force: boolean;
  probe: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { force: false, probe: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--probe") {
      options.probe = true;
    } else if (arg === "--from" || arg === "--to") {
      const value = argv[index + 1];
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`${arg} needs a YYYY-MM-DD date`);
      }
      options[arg === "--from" ? "from" : "to"] = value;
      index += 1;
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return options;
}

interface MappedRow {
  date: string;
  close: number | null;
  previous: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  volume: number | null;
  value: number | null;
  frequency: number | null;
  numberOfStock: number | null;
  marketCapital: string | null;
}

/** Throws rather than guessing if IDX drops or renames a field we depend on. */
function mapComposite(records: Record<string, unknown>[]): MappedRow {
  const composite = records.find((record) => record.IndexCode === INDEX_CODE);
  if (!composite) {
    const codes = records.map((record) => record.IndexCode).filter(Boolean);
    throw new Error(
      `No ${INDEX_CODE} row in the response (${records.length} indices: ${codes.slice(0, 8).join(", ")}…).`,
    );
  }

  const date = /^(\d{4}-\d{2}-\d{2})/.exec(String(composite.Date ?? ""))?.[1];
  if (!date) {
    throw new Error(`${INDEX_CODE} row has no usable Date: ${JSON.stringify(composite.Date)}`);
  }

  const row: MappedRow = {
    date,
    close: toNumber(composite.Close),
    previous: toNumber(composite.Previous),
    high: toNumber(composite.Highest),
    low: toNumber(composite.Lowest),
    change: toNumber(composite.Change),
    volume: toNumber(composite.Volume),
    value: toNumber(composite.Value),
    frequency: toNumber(composite.Frequency),
    numberOfStock: toNumber(composite.NumberOfStock),
    marketCapital: toNumericLiteral(composite.MarketCapital),
  };

  if (row.close === null) {
    throw new Error(`${INDEX_CODE} row for ${date} has no Close; refusing to write.`);
  }
  // high < low would mean the fields swapped meaning upstream.
  if (row.high !== null && row.low !== null && row.high < row.low) {
    throw new Error(`${date}: Highest ${row.high} is below Lowest ${row.low}`);
  }

  return row;
}

const UPSERT_SQL = `
  INSERT INTO index_summaries
    (date, close, previous, high, low, change, volume, value, frequency,
     number_of_stock, market_capital)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  ON CONFLICT ON CONSTRAINT uq_index_summary_date
  DO UPDATE SET close = EXCLUDED.close, previous = EXCLUDED.previous,
                high = EXCLUDED.high, low = EXCLUDED.low, change = EXCLUDED.change,
                volume = EXCLUDED.volume, value = EXCLUDED.value,
                frequency = EXCLUDED.frequency,
                number_of_stock = EXCLUDED.number_of_stock,
                market_capital = EXCLUDED.market_capital,
                updated_at = now()`;

function upsertParams(row: MappedRow): unknown[] {
  return [
    row.date, row.close, row.previous, row.high, row.low, row.change,
    row.volume, row.value, row.frequency, row.numberOfStock, row.marketCapital,
  ];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.probe) {
    const records = await fetchRecords(options.from);
    const composite = records.find((record) => record.IndexCode === INDEX_CODE);
    console.log(`${records.length} indices returned; ${INDEX_CODE} raw:\n`);
    console.log(JSON.stringify(composite, null, 2));
    console.log("\nMapped:\n");
    console.log(JSON.stringify(mapComposite(records), null, 2));
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // No range: the after-close job, one request for the latest session.
    if (!options.from && !options.to) {
      const row = mapComposite(await fetchRecords());
      const before = await client.query("SELECT 1 FROM index_summaries WHERE date = $1", [row.date]);
      await client.query(UPSERT_SQL, upsertParams(row));
      console.log(
        `${(before.rowCount ?? 0) > 0 ? "Updated" : "Stored"} ${INDEX_CODE} for ${row.date}: ` +
          `close ${row.close}, change ${row.change}, value ${row.value?.toLocaleString()}`,
      );
      return;
    }

    // Trading days are taken from broker_summaries, so shut days are never requested.
    const conditions: string[] = [];
    const params: string[] = [];
    if (options.from) {
      params.push(options.from);
      conditions.push(`date >= $${params.length}`);
    }
    if (options.to) {
      params.push(options.to);
      conditions.push(`date <= $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: candidates } = await client.query<{ date: string }>(
      `SELECT DISTINCT date::text AS date FROM broker_summaries ${where} ORDER BY 1`,
      params,
    );
    if (candidates.length === 0) {
      console.log("No known trading days in that range — broker_summaries has nothing to match.");
      return;
    }

    const { rows: storedRows } = await client.query<{ date: string }>(
      "SELECT date::text AS date FROM index_summaries",
    );
    const stored = new Set(storedRows.map((row) => row.date));
    const pending = candidates
      .map((row) => row.date)
      .filter((date) => options.force || !stored.has(date));

    console.log(
      `${candidates.length} trading day(s) in range, ${pending.length} to fetch` +
        (options.force ? " (--force)" : "") +
        `. ~${Math.ceil((pending.length * 3) / 60)} min at IDX's pace.`,
    );

    let written = 0;
    const failures: string[] = [];

    for (const [index, date] of pending.entries()) {
      try {
        const records = await fetchRecords(date);
        const row = mapComposite(records);
        if (row.date !== date) {
          // IDX ignored the date rather than erroring; writing it would file the
          // wrong session under the requested day.
          failures.push(`${date}: IDX returned ${row.date} instead`);
          continue;
        }
        await client.query(UPSERT_SQL, upsertParams(row));
        written += 1;
        console.log(`  [${index + 1}/${pending.length}] ${date} close ${row.close}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("403")) {
          console.error(`\nAborting at ${date}: ${message}`);
          break;
        }
        failures.push(`${date}: ${message}`);
      }
    }

    const { rows: summary } = await client.query<{ days: string; mn: string; mx: string }>(
      "SELECT count(*) AS days, min(date)::text AS mn, max(date)::text AS mx FROM index_summaries",
    );
    console.log(
      `\nStored ${written} day(s). index_summaries now covers ` +
        `${summary[0].days} trading days, ${summary[0].mn} → ${summary[0].mx}.`,
    );
    if (failures.length > 0) {
      console.error(`\n${failures.length} failure(s):`);
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
