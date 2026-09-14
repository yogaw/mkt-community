import { createReadStream, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";

/**
 * Shared loader for the market-data CSV exports.
 *
 * Goes through COPY rather than Prisma: the exports run to millions of rows, so
 * a row-at-a-time client would take hours. The file is streamed, never read into
 * memory, so a 400MB+ export costs no more than a small one.
 *
 * Rows land in an UNLOGGED staging table first, then move across with
 * ON CONFLICT DO NOTHING. That makes an import idempotent — re-running it, or
 * resuming after a crash, skips what is already there instead of failing on the
 * unique constraint. It also tolerates duplicate keys *within* one file, which
 * DO UPDATE would reject ("cannot affect row a second time").
 *
 * Existing rows are never overwritten. To re-import a day with corrected
 * figures, delete that date first.
 */

export interface ImportSpec {
  table: string;
  /** Must match the CSV header exactly, in order. */
  columns: readonly string[];
  /** Name of the unique constraint that makes a re-run a no-op. */
  conflictConstraint: string;
  /**
   * Set when the identity column is GENERATED ALWAYS: without it Postgres
   * rejects the ids carried in the export.
   */
  overridingSystemValue?: boolean;
  /** Filenames to look for when no path is given, e.g. /^stock_summaries.*\.csv$/i */
  filePattern: RegExp;
}

export interface ImportResult {
  path: string;
  staged: number;
  inserted: number;
  skipped: number;
}

const DATA_DIR = "data";

export function resolveCsvPath(spec: ImportSpec, explicit: string | undefined, usage: string): string {
  if (explicit) {
    return explicit;
  }

  const candidates = readdirSync(DATA_DIR)
    .filter((name) => spec.filePattern.test(name))
    .sort();

  if (candidates.length === 0) {
    console.error(`No matching CSV in ${DATA_DIR}/. Pass a path explicitly:\n  ${usage}`);
    process.exit(1);
  }

  // Names carry an export timestamp, so the last one sorted is the newest.
  return join(DATA_DIR, candidates[candidates.length - 1]);
}

/** Reads the header row so a column-order mismatch fails before the load, not during. */
async function readHeader(path: string): Promise<string[]> {
  const stream = createReadStream(path, { encoding: "utf8", end: 64 * 1024 });
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk;
    const newline = buffer.indexOf("\n");
    if (newline !== -1) {
      stream.destroy();
      return buffer
        .slice(0, newline)
        .trim()
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, "").toLowerCase());
    }
  }
  return [];
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function bulkImportCsv(
  client: Client,
  spec: ImportSpec,
  path: string,
): Promise<ImportResult> {
  const { size } = statSync(path);

  const header = await readHeader(path);
  const expected = spec.columns.join(",");
  if (header.join(",") !== expected) {
    console.error(
      `Unexpected CSV columns in ${path}.\n  expected: ${expected}\n  found:    ${header.join(",")}`,
    );
    process.exit(1);
  }

  const staging = `${spec.table}_import`;
  const columnList = spec.columns.join(",");

  console.log(`Importing ${basename(path)} (${formatBytes(size)})`);

  try {
    // UNLOGGED skips WAL for the staging copy; it is dropped either way, and a
    // crash mid-import just means re-running.
    await client.query(`DROP TABLE IF EXISTS ${staging}`);
    await client.query(`CREATE UNLOGGED TABLE ${staging} (LIKE ${spec.table} INCLUDING DEFAULTS)`);

    const started = Date.now();
    let copied = 0;
    const source = createReadStream(path);
    source.on("data", (chunk) => {
      copied += chunk.length;
      // Rewritable single line, so a long import still shows progress.
      process.stdout.write(
        `\r  copying… ${formatBytes(copied)} / ${formatBytes(size)} (${((copied / size) * 100).toFixed(1)}%)`,
      );
    });

    const target = client.query(
      copyFrom(`COPY ${staging} (${columnList}) FROM STDIN WITH (FORMAT csv, HEADER true)`),
    );
    await pipeline(source, target);
    process.stdout.write("\n");

    const stagedRows = await client.query<{ count: string }>(`SELECT count(*) FROM ${staging}`);
    const staged = Number(stagedRows.rows[0].count);
    console.log(`  staged ${staged.toLocaleString()} rows in ${((Date.now() - started) / 1000).toFixed(1)}s`);

    console.log(`  merging into ${spec.table}…`);
    const overriding = spec.overridingSystemValue ? " OVERRIDING SYSTEM VALUE" : "";
    const inserted = await client.query(
      `INSERT INTO ${spec.table} (${columnList})${overriding}
       SELECT ${columnList} FROM ${staging}
       ON CONFLICT ON CONSTRAINT ${spec.conflictConstraint} DO NOTHING`,
    );

    // The export carries ids from the source database, so the identity sequence
    // is still at 1 and the next generated id would collide. Fast-forward it.
    await client.query(
      `SELECT setval(
         pg_get_serial_sequence('${spec.table}', 'id'),
         GREATEST((SELECT COALESCE(max(id), 0) FROM ${spec.table}), 1)
       )`,
    );

    const insertedCount = inserted.rowCount ?? 0;
    return { path, staged, inserted: insertedCount, skipped: staged - insertedCount };
  } finally {
    await client.query(`DROP TABLE IF EXISTS ${staging}`);
  }
}
