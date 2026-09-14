import type { Metadata } from "next";
import { StockAnalysisEntry } from "@/features/stock-analysis/components/stock-analysis-entry";

export const metadata: Metadata = {
  title: "Stock Analysis — Piranha",
  description:
    "Broker flow, ownership activity, company profile and fundamentals for Indonesian stocks.",
};

/** Resolves a stock and hands over to the workspace at /stock-analysis/[ticker]. */
export default function StockAnalysisIndexPage() {
  return <StockAnalysisEntry />;
}
