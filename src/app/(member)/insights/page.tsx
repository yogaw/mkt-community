import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Insights — Piranha",
  description: "Piranha market notes, deep dives and weekly outlooks.",
};

export default function InsightsPage() {
  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6">
      <EmptyState
        title="Insights are on the way"
        description="Market notes, deep dives and weekly outlooks will live here. Until then, today's briefing and insights are on your dashboard."
        action={
          <ButtonLink href="/" variant="secondary" className="w-auto px-5">
            Back to Dashboard
          </ButtonLink>
        }
      />
    </main>
  );
}
