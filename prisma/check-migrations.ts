import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Refuses migrations that would destroy ingested market data.
 *
 *   npm run migrate           # guard, then prisma migrate deploy
 *   npm run check:migrations  # guard only
 *
 * WHY THIS EXISTS
 * `prisma migrate diff --from-config-datasource --to-schema` compares the live
 * database against schema.prisma and drops anything the schema does not declare.
 * The market-data tables are deliberately outside the datamodel — broker_summaries
 * is range-partitioned, which Prisma cannot express — so a generated migration
 * happily emits `DROP TABLE market_flow_daily`. That has happened once, on
 * 2026-09-12, taking market_flow_daily and eight index_summaries columns with it.
 *
 * Application tables are prefixed `t_` and Prisma owns them. Anything else is
 * ingested data, is expensive or impossible to re-fetch, and must only be
 * altered by a hand-written migration that says so explicitly.
 */
const MIGRATIONS_DIR = join("prisma", "migrations");

/** Put this in a hand-written migration that really does mean to do it. */
const OVERRIDE = "prisma-guard: allow-destructive";

const DESTRUCTIVE =
  /\b(DROP\s+TABLE|TRUNCATE\s+TABLE|TRUNCATE)\s+(IF\s+EXISTS\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?|ALTER\s+TABLE\s+"?([A-Za-z_][A-Za-z0-9_]*)"?[\s\S]{0,400}?DROP\s+COLUMN/gi;

interface Finding {
  migration: string;
  table: string;
  statement: string;
}

function findingsFor(migration: string, sql: string): Finding[] {
  if (sql.includes(OVERRIDE)) {
    return [];
  }

  const findings: Finding[] = [];
  for (const match of sql.matchAll(DESTRUCTIVE)) {
    const table = (match[3] ?? match[4] ?? "").toLowerCase();
    // Prisma owns the t_ tables; dropping one of those is ordinary schema work.
    if (table === "" || table.startsWith("t_")) {
      continue;
    }
    findings.push({
      migration,
      table,
      statement: match[0].replace(/\s+/g, " ").slice(0, 90),
    });
  }
  return findings;
}

function main(): void {
  const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const findings: Finding[] = [];
  for (const migration of migrations) {
    const path = join(MIGRATIONS_DIR, migration, "migration.sql");
    try {
      findings.push(...findingsFor(migration, readFileSync(path, "utf8")));
    } catch {
      // A migration directory without a SQL file is Prisma's business, not ours.
    }
  }

  if (findings.length === 0) {
    console.log(`Checked ${migrations.length} migration(s); nothing destructive to ingested data.`);
    return;
  }

  console.error("Refusing to apply: these migrations destroy non-application tables.\n");
  for (const finding of findings) {
    console.error(`  ${finding.migration}`);
    console.error(`    ${finding.table}  <-  ${finding.statement}\n`);
  }
  console.error(
    "These tables hold ingested market data that Prisma does not manage. A generated\n" +
      "migration cannot know that. Hand-write the migration, or if the loss is intended\n" +
      `add this comment to it:\n\n  -- ${OVERRIDE}\n`,
  );
  process.exit(1);
}

main();
