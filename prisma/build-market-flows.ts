import "dotenv/config";
import { Client } from "pg";

/**
 * Derives market-level foreign/domestic flow from broker_summaries.
 *
 *   npm run build:market-flows                              # every date not yet built
 *   npm run build:market-flows -- --from 2026-06-01 --to 2026-09-12
 *   npm run build:market-flows -- --force                   # rebuild stored dates
 *
 * WHY BROKER SUMMARIES, NOT STOCK SUMMARIES
 * stock_summaries.foreign_buy / foreign_sell are SHARES, not rupiah — verified
 * on 2026-09-11, where BBCA shows foreign_buy 71,131,400 against a volume of
 * 187,922,700 and a value of Rp 1.19T. Multiplying shares by close would invent
 * a number that was never executed, so it is not done anywhere in this file.
 * broker_summaries carries the executed `value` in IDR per broker per side,
 * and `is_foreign` classifies the broker, which is what makes this possible.
 *
 * GROSS vs NET ROWS
 * broker_summaries holds both. is_net = false are gross buy and sell rows and
 * sum to the same market turnover on each side; is_net = true are IDX's own
 * per-broker nets and would double-count. Only gross rows are read.
 *
 * SCOPES
 *   REGULAR  txn_type 'RG'
 *   ALL      every txn_type (RG + NG in the data so far)
 *
 * Non-trading days simply have no broker rows, so they produce no output. The
 * job never writes a zero row for a day the market was shut.
 */

/**
 * broker_summaries.volume is in LOTS; index_summaries and stock_summaries are
 * in SHARES. Measured on 2026-09-11: the broker rows imply an average price of
 * Rp 50,911 untouched and Rp 509 at x100, against the index's Rp 514, and the
 * share totals then agree to 1%. Everything written here is SHARES, so one unit
 * holds across every volume column in the database.
 */
const SHARES_PER_LOT = 100;

/**
 * Cross-source guard against a silent unit change.
 *
 * The two sources do not measure quite the same thing — IDX's index volume and
 * the sum of broker buy-side volume diverge by 1.99% on average across the 71
 * days held, worst 22.12%, none above 25%. So the threshold is not a data
 * quality bar; it exists to catch the lot convention changing, which would show
 * up as 9,900%. 50% sits far above the observed noise and far below that.
 */
const MAX_VOLUME_DIVERGENCE = 0.5;

const SCOPES = [
  { scope: "REGULAR", filter: "AND b.txn_type = 'RG'" },
  { scope: "ALL", filter: "" },
] as const;

/**
 * IDX's own gross buy and sell totals do not always tie out — measured across
 * the 71 days held locally, 5 differ by more than 0.1% and the worst is 0.53%
 * (2026-06-04: buy Rp 23.795T against sell Rp 23.843T). That imbalance is
 * upstream, so it cannot be validated away.
 *
 * What CAN be checked exactly is that the foreign/domestic split accounts for
 * all of it: splitting one turnover two ways means
 *
 *   foreign_net + domestic_net === total_buy - total_sell
 *
 * must hold to the rupiah. A deviation is a bug here — an unclassified broker,
 * a double-counted row — not upstream noise. The loose ratio below only warns,
 * so a genuine upstream change still gets noticed.
 */
const IDX_IMBALANCE_WARN_RATIO = 0.01;

interface Options {
  from?: string;
  to?: string;
  force: boolean;
}

function parseOptions(argv: string[]): Options {
  const options: Options = { force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
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

interface FlowRow {
  total_value: string;
  total_sell_value: string;
  total_volume: string;
  total_frequency: string;
  foreign_buy_value: string;
  foreign_sell_value: string;
  foreign_buy_volume: string;
  foreign_sell_volume: string;
  domestic_buy_value: string;
  domestic_sell_value: string;
}

/** Both sides in one pass; FILTER keeps it a single scan of the day. */
const AGGREGATE_SQL = (scopeFilter: string) => `
  SELECT
    COALESCE(sum(b.value)     FILTER (WHERE b.action = 'BUY'), 0)::text  AS total_value,
    COALESCE(sum(b.value)     FILTER (WHERE b.action = 'SELL'), 0)::text AS total_sell_value,
    (COALESCE(sum(b.volume) FILTER (WHERE b.action = 'BUY'), 0) * ${SHARES_PER_LOT})::text  AS total_volume,
    COALESCE(sum(b.frequency) FILTER (WHERE b.action = 'BUY'), 0)::text  AS total_frequency,
    COALESCE(sum(b.value)  FILTER (WHERE b.is_foreign AND b.action = 'BUY'), 0)::text      AS foreign_buy_value,
    COALESCE(sum(b.value)  FILTER (WHERE b.is_foreign AND b.action = 'SELL'), 0)::text     AS foreign_sell_value,
    (COALESCE(sum(b.volume) FILTER (WHERE b.is_foreign AND b.action = 'BUY'), 0) * ${SHARES_PER_LOT})::text   AS foreign_buy_volume,
    (COALESCE(sum(b.volume) FILTER (WHERE b.is_foreign AND b.action = 'SELL'), 0) * ${SHARES_PER_LOT})::text  AS foreign_sell_volume,
    COALESCE(sum(b.value)  FILTER (WHERE NOT b.is_foreign AND b.action = 'BUY'), 0)::text  AS domestic_buy_value,
    COALESCE(sum(b.value)  FILTER (WHERE NOT b.is_foreign AND b.action = 'SELL'), 0)::text AS domestic_sell_value
  FROM broker_summaries b
  WHERE b.date = $1 AND b.is_net = false ${scopeFilter}
`;

function validate(date: string, scope: string, row: FlowRow, indexVolume: number | null): void {
  const foreignNet = BigInt(row.foreign_buy_value) - BigInt(row.foreign_sell_value);
  const domesticNet = BigInt(row.domestic_buy_value) - BigInt(row.domestic_sell_value);
  const total = BigInt(row.total_value);

  if (total === BigInt(0)) {
    throw new Error(`${date} ${scope}: gross rows present but total value is 0`);
  }

  // Scoped sums must not exceed the scope's own turnover.
  if (BigInt(row.foreign_buy_value) > total || BigInt(row.foreign_sell_value) > total) {
    throw new Error(`${date} ${scope}: foreign side exceeds total turnover`);
  }

  // Exact: the two sides must account for the whole turnover, including any
  // imbalance IDX itself shipped.
  const idxImbalance = total - BigInt(row.total_sell_value);
  const residual = foreignNet + domesticNet;
  if (residual !== idxImbalance) {
    throw new Error(
      `${date} ${scope}: foreign_net + domestic_net = ${residual}, but IDX's own ` +
        `buy - sell = ${idxImbalance}. The foreign/domestic split does not account ` +
        `for the full turnover — check is_foreign coverage and the gross/net filter.`,
    );
  }

  // Unit guard. Only meaningful for the whole market, which is what IDX's
  // index volume covers.
  if (scope === "ALL" && indexVolume !== null && indexVolume > 0) {
    const divergence = Math.abs(Number(row.total_volume) - indexVolume) / indexVolume;
    if (divergence > MAX_VOLUME_DIVERGENCE) {
      throw new Error(
        `${date}: broker share volume ${row.total_volume} diverges ` +
          `${(divergence * 100).toFixed(1)}% from IDX's index volume ${indexVolume}. ` +
          `The lot convention (x${SHARES_PER_LOT}) may have changed upstream.`,
      );
    }
  }

  // Advisory: upstream noise is expected, a jump in it is worth seeing.
  const ratio = Number(idxImbalance < BigInt(0) ? -idxImbalance : idxImbalance) / Number(total);
  if (ratio > IDX_IMBALANCE_WARN_RATIO) {
    console.warn(
      `  ! ${date} ${scope}: IDX's gross buy and sell differ by ` +
        `${(ratio * 100).toFixed(4)}% of turnover`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const conditions = ["b.is_net = false"];
    const params: string[] = [];
    if (options.from) {
      params.push(options.from);
      conditions.push(`b.date >= $${params.length}`);
    }
    if (options.to) {
      params.push(options.to);
      conditions.push(`b.date <= $${params.length}`);
    }

    const { rows: dateRows } = await client.query<{ date: string }>(
      `SELECT DISTINCT b.date::text AS date FROM broker_summaries b
       WHERE ${conditions.join(" AND ")} ORDER BY 1`,
      params,
    );

    if (dateRows.length === 0) {
      console.log("No broker_summaries rows in that range — nothing to build.");
      return;
    }

    const { rows: builtRows } = await client.query<{ date: string }>(
      "SELECT DISTINCT date::text AS date FROM market_flow_daily",
    );
    const built = new Set(builtRows.map((row) => row.date));

    const pending = options.force
      ? dateRows.map((row) => row.date)
      : dateRows.map((row) => row.date).filter((date) => !built.has(date));

    console.log(
      `${dateRows.length} trading day(s) available, ${pending.length} to build` +
        (options.force ? " (--force)" : ""),
    );

    const { rows: indexRows } = await client.query<{ date: string; volume: string | null }>(
      "SELECT date::text AS date, volume::text AS volume FROM index_summaries",
    );
    const indexVolumeByDate = new Map(
      indexRows.map((row) => [row.date, row.volume === null ? null : Number(row.volume)]),
    );

    let written = 0;
    for (const date of pending) {
      for (const { scope, filter } of SCOPES) {
        const { rows } = await client.query<FlowRow>(AGGREGATE_SQL(filter), [date]);
        const row = rows[0];
        if (!row || BigInt(row.total_value) === BigInt(0)) {
          // No rows in this scope for this date — skip rather than write zeros.
          continue;
        }

        validate(date, scope, row, indexVolumeByDate.get(date) ?? null);

        await client.query(
          `INSERT INTO market_flow_daily (
             date, scope, total_value, total_volume, total_frequency,
             foreign_buy_value, foreign_sell_value, foreign_net_value,
             foreign_buy_volume, foreign_sell_volume, foreign_net_volume,
             domestic_buy_value, domestic_sell_value, domestic_net_value
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, ($6::bigint - $7::bigint),
             $8, $9, ($8::bigint - $9::bigint),
             $10, $11, ($10::bigint - $11::bigint)
           )
           ON CONFLICT ON CONSTRAINT market_flow_daily_uniq DO UPDATE SET
             total_value = EXCLUDED.total_value,
             total_volume = EXCLUDED.total_volume,
             total_frequency = EXCLUDED.total_frequency,
             foreign_buy_value = EXCLUDED.foreign_buy_value,
             foreign_sell_value = EXCLUDED.foreign_sell_value,
             foreign_net_value = EXCLUDED.foreign_net_value,
             foreign_buy_volume = EXCLUDED.foreign_buy_volume,
             foreign_sell_volume = EXCLUDED.foreign_sell_volume,
             foreign_net_volume = EXCLUDED.foreign_net_volume,
             domestic_buy_value = EXCLUDED.domestic_buy_value,
             domestic_sell_value = EXCLUDED.domestic_sell_value,
             domestic_net_value = EXCLUDED.domestic_net_value,
             updated_at = now()`,
          [
            date, scope, row.total_value, row.total_volume, row.total_frequency,
            row.foreign_buy_value, row.foreign_sell_value,
            row.foreign_buy_volume, row.foreign_sell_volume,
            row.domestic_buy_value, row.domestic_sell_value,
          ],
        );
        written += 1;
      }
    }

    const { rows: summary } = await client.query<{ days: string; mn: string; mx: string }>(
      "SELECT count(DISTINCT date) AS days, min(date)::text AS mn, max(date)::text AS mx FROM market_flow_daily",
    );
    console.log(
      `Wrote ${written} scope-row(s). market_flow_daily now covers ` +
        `${summary[0].days} trading days, ${summary[0].mn} → ${summary[0].mx}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
