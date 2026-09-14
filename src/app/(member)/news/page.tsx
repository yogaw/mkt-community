import type { Metadata } from "next";
import { NewsView } from "@/features/news/components/news-view";

export const metadata: Metadata = {
  title: "News — Piranha",
  description: "Media articles, IDX disclosures and the market calendar in one place.",
};

export default function NewsPage() {
  return <NewsView />;
}
