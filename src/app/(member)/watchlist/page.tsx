import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Watchlist — Piranha",
  description: "Your personal IDX watchlist.",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6">
      <EmptyState
        title="Your watchlist is coming soon"
        description="Track your personal IDX stocks here in an upcoming update. For now, Stocks in Focus on the dashboard highlights what Piranha is watching."
        action={
          <ButtonLink href="/" variant="secondary" className="w-auto px-5">
            Back to Dashboard
          </ButtonLink>
        }
      />
    </main>
  );
}
