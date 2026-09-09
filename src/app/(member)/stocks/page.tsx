import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Stocks — Piranha",
  description: "Piranha analysis pages for IDX stocks.",
};

export default function StocksPage() {
  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6">
      <EmptyState
        title="Individual stock pages are coming soon"
        description="Full analysis pages for IDX stocks are in development. Today's Stocks in Focus are on your dashboard."
        action={
          <ButtonLink href="/" variant="secondary" className="w-auto px-5">
            Back to Dashboard
          </ButtonLink>
        }
      />
    </main>
  );
}
