import { Suspense } from "react";
import type { Metadata } from "next";
import { StockAnalysisPage } from "@/features/stock-analysis/components/stock-analysis-page";

export const metadata: Metadata = {
  title: "Stock Analysis — Piranha",
  description:
    "Broker flow, ownership activity, company profile and fundamentals for Indonesian stocks.",
};

export default function StockAnalysisIndexPage() {
  // The search term lives in the query string, so the subtree opts out of
  // static prerendering and needs a Suspense boundary.
  return (
    <Suspense>
      <StockAnalysisPage />
    </Suspense>
  );
}
