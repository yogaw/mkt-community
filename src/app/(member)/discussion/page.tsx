import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscussionPage } from "@/features/discussion/components/discussion-page";

export const metadata: Metadata = {
  title: "Discussions — Piranha",
  description: "Curated conversations to help you become a better investor.",
};

export default function DiscussionIndexPage() {
  // The board reads its filters from the query string, so it needs a Suspense
  // boundary: useSearchParams opts the subtree out of static prerendering.
  return (
    <Suspense>
      <DiscussionPage />
    </Suspense>
  );
}
