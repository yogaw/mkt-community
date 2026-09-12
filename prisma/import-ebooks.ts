import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { db } from "../src/database";
import { EbookTagKind } from "../src/database/prisma/enums";

/**
 * Loads documents into the member library.
 *
 *   npm run import:ebooks
 *
 * Copies each PDF into the upload store under a generated name and records the
 * metadata. Idempotent by id: re-running updates the row and replaces the file
 * reference rather than creating a duplicate.
 *
 * The catalogue below is the four documents supplied on 2026-09-12. Metadata
 * (source, analyst, date, tickers) is transcribed from the documents themselves,
 * not inferred.
 *
 * NOTE ON REDISTRIBUTION
 * These are third-party broker reports carrying their own restrictions — the
 * Trimegah note states it is "provided solely for the information of clients"
 * and bars quoting it in whole or part without permission; the UOB Kay Hian
 * disclaimers cover confidentiality and restrictions on circulation and
 * distribution. Publishing them to members is a licensing decision for the
 * operator, not a technical one. The download route requires authentication so
 * the files are at least not publicly linkable.
 */
const UPLOAD_DIR = join(process.cwd(), "uploads");

interface SeedEbook {
  id: string;
  path: string;
  title: string;
  tag: EbookTagKind;
  source: string;
  author: string | null;
  summary: string;
  tickers: string[];
  publishedAt: string;
}

const SOURCE_DIR = process.env.EBOOK_SOURCE_DIR ?? "/mnt/c/Users/ekidot/Downloads";

const catalogue: SeedEbook[] = [
  {
    id: "ebook-uobkh-eraa-20260904",
    path: "Erajaya_Swasembada_Tbk_PT-_Building_New_Growth_Engines.pdf",
    title: "Erajaya Swasembada (ERAA) — Building New Growth Engines",
    tag: EbookTagKind.RESEARCH_REPORT,
    source: "UOB Kay Hian",
    author: "Willinoy Sitorus; Andrew Agita Buntoro, CFA",
    summary:
      "Maintains BUY with target price raised to Rp800 from Rp450. Erablue delivered 15.9% SSSG in 7M26 with 102 stores added ytd, while ERAL, XPENG and new F&B concepts broaden the group beyond smartphones. Smartphone SSSG improved to -8.6% in July from -11.6% in June.",
    tickers: ["ERAA"],
    publishedAt: "2026-09-04",
  },
  {
    id: "ebook-trimegah-cpin-20260831",
    path: "Trimegah CF 20260831 CPIN - Obvious post-rebalancing play.pdf",
    title: "Charoen Pokphand Indonesia (CPIN) — Obvious Post-Rebalancing Play",
    tag: EbookTagKind.RESEARCH_REPORT,
    source: "Trimegah Sekuritas",
    author: "Ignatius Samon; Heribertus Ariando; Luther Avery",
    summary:
      "Maintains BUY with target price cut to Rp4,400 from Rp5,500. 1H26 earnings beat at 59%/60% of estimates on feed-margin expansion. Trading at a historical low 7x P/E after a 32% ytd de-rating; the post-MSCI-rebalancing window is argued as the entry point.",
    tickers: ["CPIN", "JPFA", "MAIN"],
    publishedAt: "2026-08-31",
  },
  {
    id: "ebook-mansek-coal-20260910",
    path: "Coal Supply Tightens.pdf",
    title: "Morning Coffee — Coal: Supply Tightens, El Nino Adds Heat",
    tag: EbookTagKind.ARTICLE,
    source: "Mandiri Sekuritas",
    author: "Mandiri Sekuritas Sales Desk",
    summary:
      "Daily desk note. Finalised RKAB quotas improve sector earnings visibility and should tighten exportable supply. AADI stays top pick (TP Rp13,500); PTBA and ITMG upgraded to Buy. Also covers cigarettes, banking and the AI infrastructure build-out.",
    tickers: ["AADI", "PTBA", "ITMG", "ADRO", "UNTR", "INDY", "GGRM"],
    publishedAt: "2026-09-10",
  },
  {
    id: "ebook-mansek-infl-20260909",
    path: "Positioning for higher for longer inflation.pdf",
    title: "Morning Coffee — Positioning for Higher-for-Longer Inflation",
    tag: EbookTagKind.ARTICLE,
    source: "Mandiri Sekuritas",
    author: "Mandiri Sekuritas Sales Desk",
    summary:
      "Daily desk note. Brent near US$99 on Middle East tension and a Niño index reading of 3.8 point to higher-for-longer inflation. Favours energy, commodities and high dividend yield; cautious on CPO given cooking-oil sensitivity.",
    tickers: ["MEDC", "AMRT", "MIKA", "AKRA", "ARCI", "INDY", "AMMN"],
    publishedAt: "2026-09-09",
  },
];

async function main(): Promise<void> {
  mkdirSync(UPLOAD_DIR, { recursive: true });

  let stored = 0;
  const missing: string[] = [];

  for (const entry of catalogue) {
    const source = join(SOURCE_DIR, entry.path);
    if (!existsSync(source)) {
      missing.push(entry.path);
      continue;
    }

    // A generated name, never the uploaded filename — the same rule the upload
    // route follows, so nothing caller-supplied reaches the filesystem.
    const fileName = `${randomUUID()}.pdf`;
    copyFileSync(source, join(UPLOAD_DIR, fileName));
    const fileSizeBytes = statSync(source).size;

    const data = {
      title: entry.title,
      tag: entry.tag,
      source: entry.source,
      author: entry.author,
      summary: entry.summary,
      tickers: entry.tickers,
      publishedAt: new Date(`${entry.publishedAt}T00:00:00+07:00`),
      fileName,
      fileSizeBytes,
    };

    try {
      await db.ebook.upsert({
        where: { id: entry.id },
        update: data,
        create: { id: entry.id, ...data },
      });
    } catch (error) {
      // The file was copied before the row was written; without this a failed
      // insert would leave an unreferenced PDF in the upload store forever.
      rmSync(join(UPLOAD_DIR, fileName), { force: true });
      throw error;
    }
    stored += 1;
    console.log(`  ${entry.tag.padEnd(15)} ${entry.title.slice(0, 58)}`);
  }

  console.log(`\nStored ${stored} document(s) in the library.`);
  if (missing.length > 0) {
    console.error(`\nNot found in ${SOURCE_DIR}:`);
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    console.error("Set EBOOK_SOURCE_DIR to point at them.");
    process.exitCode = 1;
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
