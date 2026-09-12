import type { Metadata } from "next";
import { MarketDataView } from "@/features/market-data/components/market-data-view";

export const metadata: Metadata = {
  title: "Market Data — Piranha",
  description: "Global macro, Indonesian market and commodity indicators in one place.",
};

export default function MarketDataPage() {
  return <MarketDataView />;
}
