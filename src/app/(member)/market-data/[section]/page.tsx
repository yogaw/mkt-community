import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketDataLayout } from "@/features/market-data/components/market-data-layout";
import {
  MARKET_SECTIONS,
  SECTION_LABEL,
  SECTION_SUBTITLE,
  type MarketSection,
} from "@/features/market-data/market-data-model";

/**
 * One route for the three sections. Each is a real URL, so a section can be
 * bookmarked, shared and reloaded, and moving between them is a client
 * transition rather than a fresh page load.
 */
export function generateStaticParams() {
  return MARKET_SECTIONS.map((section) => ({ section }));
}

function parse(value: string): MarketSection | null {
  return (MARKET_SECTIONS as readonly string[]).includes(value) ? (value as MarketSection) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const section = parse((await params).section);
  if (!section) {
    return { title: "Market Data — Piranha" };
  }
  return {
    title: `${SECTION_LABEL[section]} — Piranha`,
    description: SECTION_SUBTITLE[section],
  };
}

export default async function MarketDataSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const section = parse((await params).section);
  if (!section) {
    notFound();
  }
  return <MarketDataLayout section={section} />;
}
