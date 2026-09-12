import "dotenv/config";
import { Client } from "pg";
import { INDICATORS } from "../src/features/market-data/indicator-catalogue";

/**
 * Pulls the daily close for every catalogued indicator.
 *
 *   npm run fetch:market-indicators
 *   npm run fetch:market-indicators -- --range 1y   # deeper history
 *   npm run fetch:market-indicators -- --probe SPX  # one symbol, writes nothing
 *
 * SOURCE
 * Yahoo Finance's chart endpoint, verified working without a key on
 * 2026-09-12. It is an undocumented endpoint: it can change shape or start
 * refusing requests, so the parser asserts on what it needs and the run
 * reports any symbol it could not read rather than writing a partial day
 * silently.
 *
 * IHSG is not fetched. index_summaries already holds it from IDX, which is the
 * authoritative copy, so it is mirrored across from there instead — two
 * sources for one number would eventually disagree on screen.
 *
 * Idempotent: upserts on (symbol, date).
 */
const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

/** Requests are sequential and spaced; the endpoint is free and unofficial. */
const DELAY_MS = 400;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

interface Options {
  range: string;
  probe?: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { range: "3mo" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--range" || arg === "--probe") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} needs a value`);
      }
      if (arg === "--range") {
        options.range = value;
      } else {
        options.probe = value.toUpperCase();
      }
      index += 1;
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return options;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface Bar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

/**
 * Turns one chart payload into daily bars.
 *
 * Throws rather than returning nothing if the shape is not what we expect —
 * a silent empty series would look exactly like a market holiday.
 */
export function toBars(payload: unknown, symbol: string): Bar[] {
  const chart = (payload as { chart?: { result?: unknown[]; error?: unknown } }).chart;
  if (!chart) {
    throw new Error(`${symbol}: response has no chart envelope`);
  }
  if (chart.error) {
    throw new Error(`${symbol}: ${JSON.stringify(chart.error)}`);
  }

  const result = chart.result?.[0] as
    | {
        timestamp?: number[];
        indicators?: { quote?: Array<Record<string, Array<number | null>>> };
      }
    | undefined;

  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  if (!timestamps || !quote || !quote.close) {
    throw new Error(`${symbol}: no timestamp/close series in the response`);
  }

  const bars: Bar[] = [];
  for (const [index, seconds] of timestamps.entries()) {
    const close = quote.close[index];
    // A null close is a non-trading slot, not a zero. Skipping keeps the
    // series honest rather than inventing a flat day.
    if (close === null || close === undefined || !Number.isFinite(close)) {
      continue;
    }
    bars.push({
      date: new Date(seconds * 1000).toISOString().slice(0, 10),
      open: quote.open?.[index] ?? null,
      high: quote.high?.[index] ?? null,
      low: quote.low?.[index] ?? null,
      close,
      volume: quote.volume?.[index] ?? null,
    });
  }

  if (bars.length === 0) {
    throw new Error(`${symbol}: every close in the window was null`);
  }
  return bars;
}

async function fetchBars(vendorSymbol: string, range: string): Promise<Bar[]> {
  const url = `${BASE}/${encodeURIComponent(vendorSymbol)}?range=${range}&interval=1d`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${vendorSymbol}: HTTP ${response.status}`);
  }
  return toBars(await response.json(), vendorSymbol);
}

const UPSERT = `
  INSERT INTO market_indicator_point (symbol, date, open, high, low, close, volume, source)
  VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
  ON CONFLICT ON CONSTRAINT market_indicator_point_uniq
  DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                close = EXCLUDED.close, volume = EXCLUDED.volume,
                source = EXCLUDED.source, updated_at = now()`;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.probe) {
    const definition = INDICATORS.find((item) => item.code === options.probe);
    if (!definition?.vendorSymbol) {
      throw new Error(`${options.probe} is not a vendor-sourced indicator`);
    }
    const bars = await fetchBars(definition.vendorSymbol, options.range);
    console.log(`${definition.code} (${definition.vendorSymbol}) — ${bars.length} bars`);
    console.log(JSON.stringify(bars.slice(-3), null, 2));
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    let written = 0;
    const failures: string[] = [];

    for (const definition of INDICATORS.filter((item) => item.source === "yahoo")) {
      await sleep(DELAY_MS);
      try {
        const bars = await fetchBars(definition.vendorSymbol!, options.range);
        for (const bar of bars) {
          await client.query(UPSERT, [
            definition.code, bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume, "yahoo",
          ]);
        }
        written += bars.length;
        console.log(`  ${definition.code.padEnd(7)} ${String(bars.length).padStart(4)} bars  last ${bars.at(-1)!.date} ${bars.at(-1)!.close}`);
      } catch (error) {
        failures.push(`${definition.code}: ${error instanceof Error ? error.message : error}`);
      }
    }

    // IHSG is mirrored from the IDX ingestion rather than fetched again.
    const mirrored = await client.query(
      `INSERT INTO market_indicator_point (symbol, date, close, volume, source)
       SELECT 'IHSG', date, close, volume, 'idx' FROM index_summaries
       ON CONFLICT ON CONSTRAINT market_indicator_point_uniq
       DO UPDATE SET close = EXCLUDED.close, volume = EXCLUDED.volume,
                     source = EXCLUDED.source, updated_at = now()`,
    );
    console.log(`  IHSG    ${String(mirrored.rowCount ?? 0).padStart(4)} bars  mirrored from index_summaries`);

    const { rows } = await client.query<{ symbols: string; days: string; mx: string }>(
      `SELECT count(DISTINCT symbol)::text AS symbols, count(DISTINCT date)::text AS days,
              max(date)::text AS mx FROM market_indicator_point`,
    );
    console.log(
      `\n${written} vendor bars written. ${rows[0].symbols} indicators, ` +
        `${rows[0].days} dates, latest ${rows[0].mx}.`,
    );

    if (failures.length > 0) {
      console.error(`\n${failures.length} indicator(s) failed:`);
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
