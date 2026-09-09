import type { Metadata } from "next";
import { SearchResultsView } from "@/features/search/components/search-results-view";

export const metadata: Metadata = {
  title: "Search — Piranha",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // Keying by query remounts the view per search so loading states reset cleanly.
  return <SearchResultsView key={q ?? ""} query={q} />;
}
