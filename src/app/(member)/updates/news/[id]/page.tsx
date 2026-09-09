import type { Metadata } from "next";
import { NewsDetailView } from "@/features/updates/components/news-detail-view";

export const metadata: Metadata = {
  title: "News — Piranha",
};

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsDetailView newsId={id} />;
}
