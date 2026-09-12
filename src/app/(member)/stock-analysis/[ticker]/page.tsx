import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StockDetailPage } from "@/features/stock-analysis/components/stock-detail-page";
import { tickerSchema } from "@/features/stock-analysis/stock-analysis-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const ticker = (await params).ticker.toUpperCase();
  return {
    title: `${ticker} — Stock Analysis — Piranha`,
    description: `Broker flow, profile and fundamentals for ${ticker} on IDX.`,
  };
}

export default async function StockDetailRoute({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  // Validated here as well as in the API, so a malformed URL is a 404 rather
  // than a page that renders and then fails every request it makes.
  const parsed = tickerSchema.safeParse((await params).ticker);
  if (!parsed.success) {
    notFound();
  }

  return (
    <Suspense>
      <StockDetailPage ticker={parsed.data} />
    </Suspense>
  );
}
