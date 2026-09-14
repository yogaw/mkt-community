import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/database";

/**
 * Loads the IDX listing universe from a CSV export.
 *
 *   npm run import:stocks ./daftar-saham.csv
 *
 * Tolerant about shape on purpose, because the official "Daftar Saham" export
 * and the various mirrors of it disagree on column order and headers:
 *   - comma or semicolon separated
 *   - a header row is detected and skipped
 *   - the ticker is the first column that looks like an IDX code, and the name
 *     is taken from the longest remaining column on that row
 *
 * Upserts by ticker, so running it repeatedly is safe and it can be used to
 * refresh names after a listing is renamed.
 */
const TICKER = /^[A-Z]{3,5}$/;

interface ParsedRow {
  ticker: string;
  name: string;
}

function splitLine(line: string): string[] {
  const separator = line.includes(";") && !line.includes(",") ? ";" : ",";
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === separator && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);

  return cells.map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function parseRow(line: string): ParsedRow | null {
  const cells = splitLine(line).filter((cell) => cell !== "");
  if (cells.length < 2) {
    return null;
  }

  const tickerIndex = cells.findIndex((cell) => TICKER.test(cell.toUpperCase()));
  if (tickerIndex === -1) {
    return null;
  }

  const rest = cells.filter((_, index) => index !== tickerIndex);
  const name = rest.reduce((longest, cell) => (cell.length > longest.length ? cell : longest), "");
  if (name.length < 2) {
    return null;
  }

  return { ticker: cells[tickerIndex].toUpperCase(), name };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run import:stocks <path-to-csv>");
    process.exit(1);
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");

  const rows = new Map<string, string>();
  let skipped = 0;
  for (const line of lines) {
    const parsed = parseRow(line);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    rows.set(parsed.ticker, parsed.name);
  }

  if (rows.size === 0) {
    console.error(`No ticker rows found in ${path}. Checked ${lines.length} lines.`);
    process.exit(1);
  }

  for (const [ticker, name] of rows) {
    await db.stock.upsert({
      where: { ticker },
      update: { name, isActive: true },
      create: { ticker, name },
    });
  }

  const total = await db.stock.count();
  console.log(`Imported ${rows.size} stocks from ${path} (${skipped} lines skipped). ${total} in total.`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
