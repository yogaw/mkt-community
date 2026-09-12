import "dotenv/config";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

/**
 * Fetches daily OHLCV from IDX for every trading day already loaded into
 * broker_summaries, and upserts it into stock_summaries.
 *
 *   npm run fetch:stock-summaries                          # every missing date
 *   npm run fetch:stock-summaries -- --from 2026-06-02 --to 2026-09-11
 *   npm run fetch:stock-summaries -- --force               # refetch dates already stored
 *   npm run fetch:stock-summaries -- --probe 2026-09-11    # dump one raw record, write nothing
 *
 * broker_summaries is the worklist on purpose: the two tables are only useful
 * together, so a date is worth fetching exactly when broker data exists for it.
 *
 * The HTTP call goes through scripts/idx_fetch.py rather than fetch(): IDX's
 * Cloudflare rule filters on the TLS fingerprint, which Node cannot forge at any
 * header or cipher setting. See that file for the measurements. Everything that
 * matters -- the worklist, the date guard, the upsert -- stays here.
 *
 * First run needs the transport's one dependency:
 *   python3 -m venv scripts/.venv
 *   scripts/.venv/bin/pip install -r scripts/requirements.txt
 */

/** Browser-TLS transport; see the file header. */
const FETCH_SCRIPT = join("scripts", "idx_fetch.py");

/**
 * IDX is strict about pacing, and a fixed interval is itself a bot signal, so
 * every request waits a random gap first -- including the very first one.
 */
const DELAY_MIN_MS = 2_000;
const DELAY_MAX_MS = 4_000;

/**
 * Retries cover rate limits and network wobble only. A 403 is never retried:
 * it means the WAF refused the handshake, and hammering it prolongs the block.
 */
const MAX_ATTEMPTS = 3;

/** Exit codes from idx_fetch.py. */
const EXIT_BLOCKED = 3;
const EXIT_RATE_LIMITED = 4;

/**
 * Target column -> the keys IDX might use for it. Matched case-insensitively
 * and in order. IDX has renamed fields between revisions and misspells
 * "Tradeble", so each column lists the spellings seen in the wild rather than
 * trusting one.
 */
const FIELDS: Record<string, string[]> = {
  ticker: ["StockCode", "Code", "Kode"],
  previous_close: ["Previous", "PreviousClose"],
  open_price: ["OpenPrice", "Open"],
  high: ["High", "Highest"],
  low: ["Low", "Lowest"],
  close: ["Close", "Last", "ClosingPrice"],
  change: ["Change"],
  volume: ["Volume"],
  value: ["Value"],
  frequency: ["Frequency", "Freq"],
  foreign_sell: ["ForeignSell", "ForeignSellVolume"],
  foreign_buy: ["ForeignBuy", "ForeignBuyVolume"],
  listed_shares: ["ListedShares"],
  tradeable_shares: ["TradebleShares", "TradeableShares", "TradableShares"],
  bid: ["Bid"],
  bid_volume: ["BidVolume"],
  offer: ["Offer"],
  offer_volume: ["OfferVolume"],
};

/**
 * The date IDX stamps on each record. Read back and compared against what we
 * asked for — see assertDateMatches.
 */
const DATE_FIELD = ["Date", "TradingDate", "Tanggal"];

/**
 * Columns where a 0 from IDX means "no such price", not a price of zero, and is
 * stored as NULL. This is the convention the backfilled export uses, and it is
 * unambiguous in the data: across 71 days these columns carry thousands of
 * NULLs and not one 0, while the quantity columns (volume, value, frequency,
 * bid_volume, foreign_*) carry thousands of 0s and not one NULL. The counts
 * corroborate each other — high/low NULLs equal volume/value/frequency zeros
 * exactly, both being the untraded rows.
 *
 * A fetched day that wrote 0.00 here instead would be the only part of the
 * table breaking that invariant, and would quietly skew any AVG or IS NULL
 * over the price columns.
 */
const PRICE_COLUMNS = new Set([
  "previous_close",
  "open_price",
  "high",
  "low",
  "change",
  "bid",
  "offer",
]);

/** Order used for both the INSERT and the generated placeholders. */
const COLUMNS = ["date", ...Object.keys(FIELDS)] as const;

interface Options {
  from?: string;
  to?: string;
  force: boolean;
  probe?: string;
}

function parseArgs(): Options {
  const argv = process.argv.slice(2);
  const options: Options = { force: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--from" || arg === "--to" || arg === "--probe") {
      const value = argv[i + 1];
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        console.error(`${arg} needs a YYYY-MM-DD date`);
        process.exit(1);
      }
      options[arg.slice(2) as "from" | "to" | "probe"] = value;
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

function lookup(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }
  // Fall back to a case-insensitive sweep before giving up.
  const lowered = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actual = lowered.get(key.toLowerCase());
    if (actual !== undefined) {
      return record[actual];
    }
  }
  return undefined;
}

/** IDX sends numbers as numbers, as strings, and occasionally as "" or "-". */
function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "" || raw === "-") {
    return null;
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** IDX stamps dates as "2026-06-02T00:00:00". */
function recordDate(record: Record<string, unknown>): string | null {
  const raw = lookup(record, DATE_FIELD);
  if (raw === null || raw === undefined) {
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(raw));
  return match ? match[1] : null;
}

/** Raised when IDX answers with a different day than the one requested. */
class DateMismatchError extends Error {}

let warnedMissingDate = false;

/**
 * Guards the backfill against the endpoint ignoring `date`.
 *
 * The browser call the site itself makes omits `date` entirely and returns the
 * latest session. If IDX were to ignore the parameter, every historical date in
 * the worklist would be written with the same recent prices — wrong data that
 * looks perfectly valid. So trust the payload over the request: whatever day
 * IDX says it sent, that is the day it sent.
 */
function assertDateMatches(requested: string, records: Record<string, unknown>[]): void {
  const returned = records.map(recordDate).find((value) => value !== null);

  if (returned === undefined) {
    if (!warnedMissingDate) {
      console.warn(
        "  ! records carry no Date field, cannot verify the day IDX returned - check with --probe",
      );
      warnedMissingDate = true;
    }
    return;
  }

  if (returned !== requested) {
    throw new DateMismatchError(
      `asked for ${requested} but IDX returned ${returned}. The endpoint is ignoring ` +
        "the date parameter, so a backfill would write the same day under every date. " +
        "Nothing was written.",
    );
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Raised on a 403: the WAF refused us, and retrying only deepens the block. */
class BlockedError extends Error {}

function resolvePython(): string {
  if (process.env.IDX_PYTHON) {
    return process.env.IDX_PYTHON;
  }
  const venv = join("scripts", ".venv", "bin", "python");
  return existsSync(venv) ? venv : "python3";
}

async function fetchDay(date: string): Promise<Record<string, unknown>[]> {
  const python = resolvePython();
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Before, not after: the pause is what makes the traffic look human, so it
    // has to apply to the first request too.
    await sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));

    try {
      const { stdout } = await execFileAsync(python, [FETCH_SCRIPT, "stock-summary", date], {
        // A full trading day of ~960 tickers runs to roughly 650KB.
        maxBuffer: 32 * 1024 * 1024,
        env: process.env,
      });
      return JSON.parse(stdout) as Record<string, unknown>[];
    } catch (error) {
      const failure = error as { code?: number; stderr?: string; message?: string };
      const detail = (failure.stderr ?? failure.message ?? "").trim();

      if (failure.code === EXIT_BLOCKED) {
        throw new BlockedError(
          "IDX returned 403. Usually this is rate-based: too many requests in a short " +
            "window, which IDX answers with a block rather than a 429. Wait before " +
            "re-running — repeated 403s extend it. Dates already stored are skipped, " +
            "so a later run resumes where this one stopped. If it still 403s after an " +
            "hour of quiet, check the transport with: " +
            "npm run fetch:stock-summaries -- --probe <a date you already have>",
        );
      }

      lastError = failure.code === EXIT_RATE_LIMITED ? "429 rate limited" : detail;

      if (attempt < MAX_ATTEMPTS) {
        await sleep(DELAY_MAX_MS * 2 ** attempt);
      }
    }
  }

  throw new Error(`${date}: ${lastError}`);
}

/** Builds one multi-row upsert. ~950 rows per day fits comfortably in a statement. */
async function upsertDay(
  client: Client,
  date: string,
  records: Record<string, unknown>[],
): Promise<{ written: number; untraded: number }> {
  const values: unknown[] = [];
  const tuples: string[] = [];
  let untraded = 0;

  for (const record of records) {
    const ticker = String(lookup(record, FIELDS.ticker) ?? "").trim().toUpperCase();
    const close = toNumber(lookup(record, FIELDS.close));

    // close is NOT NULL; a row without one is not a summary of anything.
    if (!ticker || close === null) {
      continue;
    }
    // close is NOT NULL, so unlike the other prices a 0 cannot be stored as
    // absence. It has never occurred across the backfill; count it so it does
    // not slip in unnoticed.
    if (close === 0) {
      untraded += 1;
    }

    const row: unknown[] = [date];
    for (const column of COLUMNS.slice(1)) {
      if (column === "ticker") {
        row.push(ticker);
        continue;
      }
      const value = toNumber(lookup(record, FIELDS[column]));
      row.push(value === 0 && PRICE_COLUMNS.has(column) ? null : value);
    }

    tuples.push(`(${row.map((_, index) => `$${values.length + index + 1}`).join(",")})`);
    values.push(...row);
  }

  if (tuples.length === 0) {
    return { written: 0, untraded: 0 };
  }

  const updates = COLUMNS.slice(1)
    .filter((column) => column !== "ticker")
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(", ");

  await client.query(
    `INSERT INTO stock_summaries (${COLUMNS.join(",")})
     VALUES ${tuples.join(",")}
     ON CONFLICT ON CONSTRAINT uq_stock_summary_date_ticker
     DO UPDATE SET ${updates}, updated_at = now()`,
    values,
  );

  return { written: tuples.length, untraded };
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.probe) {
    const records = await fetchDay(options.probe);
    const returned = records.map(recordDate).find((value) => value !== null);
    console.log(`${records.length} records for ${options.probe}.`);
    console.log(
      returned === undefined
        ? "IDX sent no Date field, so the date parameter cannot be verified."
        : returned === options.probe
          ? `IDX confirms the date: ${returned}. Backfilling by date works.`
          : `WARNING: asked for ${options.probe}, IDX returned ${returned}. ` +
            "The date parameter is being ignored - a backfill would be wrong.",
    );
    console.log("\nFirst record raw:\n");
    console.log(JSON.stringify(records[0], null, 2));
    console.log("\nMapped to stock_summaries columns:\n");
    for (const column of Object.keys(FIELDS)) {
      const raw = lookup(records[0] ?? {}, FIELDS[column]);
      const flag = raw === undefined ? "  MISSING <-" : "";
      console.log(`  ${column.padEnd(18)} ${JSON.stringify(raw) ?? "undefined"}${flag}`);
    }
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const rangeFilters: string[] = [];
    const params: string[] = [];
    if (options.from) {
      params.push(options.from);
      rangeFilters.push(`b.date >= $${params.length}`);
    }
    if (options.to) {
      params.push(options.to);
      rangeFilters.push(`b.date <= $${params.length}`);
    }

    const filters = [...rangeFilters];
    if (!options.force) {
      filters.push("NOT EXISTS (SELECT 1 FROM stock_summaries s WHERE s.date = b.date)");
    }

    const { rows } = await client.query<{ date: string }>(
      `SELECT DISTINCT b.date::text AS date FROM broker_summaries b
       ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
       ORDER BY date`,
      params,
    );

    if (rows.length === 0) {
      // Tell the two empty cases apart: no broker data at all in the range is a
      // different problem from every date already being fetched.
      const { rows: available } = await client.query<{ count: string }>(
        `SELECT count(DISTINCT date) AS count FROM broker_summaries b
         ${rangeFilters.length ? `WHERE ${rangeFilters.join(" AND ")}` : ""}`,
        params.slice(0, rangeFilters.length),
      );

      console.log(
        Number(available[0].count) === 0
          ? "No dates in broker_summaries for that range — import the broker CSV first."
          : "Nothing to do — every broker_summaries date already has stock summaries. Use --force to refetch.",
      );
      return;
    }

    console.log(
      `${rows.length} date(s) to fetch, ${rows[0].date} → ${rows[rows.length - 1].date}.`,
    );

    let written = 0;
    let untraded = 0;
    const empty: string[] = [];
    const failed: string[] = [];

    for (const [index, { date }] of rows.entries()) {
      const position = `[${String(index + 1).padStart(String(rows.length).length)}/${rows.length}]`;
      try {
        const records = await fetchDay(date);
        assertDateMatches(date, records);
        const result = await upsertDay(client, date, records);
        written += result.written;
        untraded += result.untraded;

        if (result.written === 0) {
          // A holiday IDX still answers for, or a date with no board data.
          empty.push(date);
          console.log(`${position} ${date}  no rows`);
        } else {
          console.log(
            `${position} ${date}  ${result.written} tickers` +
              (result.untraded ? ` (${result.untraded} untraded)` : ""),
          );
        }
      } catch (error) {
        // A wrong day back is systemic, not a blip: every remaining date would
        // hit it too, so stop rather than grind through the whole worklist.
        if (error instanceof BlockedError) {
          console.log(`${position} ${date}  ABORTED — ${error.message}`);
          process.exitCode = 1;
          return;
        }
        if (error instanceof DateMismatchError) {
          console.log(`${position} ${date}  ABORTED — ${error.message}`);
          process.exitCode = 1;
          return;
        }
        failed.push(date);
        console.log(`${position} ${date}  FAILED — ${(error as Error).message}`);
      }
    }

    console.log(`\nDone. ${written.toLocaleString()} rows upserted across ${rows.length} date(s).`);
    if (untraded) {
      console.log(
        `WARNING: ${untraded.toLocaleString()} row(s) had close = 0, which no row in the ` +
          "backfill does. Check them before relying on those days.",
      );
    }
    if (empty.length) {
      console.log(`${empty.length} date(s) returned nothing: ${empty.join(", ")}`);
    }
    if (failed.length) {
      console.log(`${failed.length} date(s) failed: ${failed.join(", ")}`);
      console.log("Re-run to retry — dates already stored are skipped.");
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
