import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Live — Piranha",
  description: "Upcoming and past live sessions for members.",
};

export default function LivePage() {
  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6">
      <EmptyState
        title="Live sessions live on your dashboard"
        description="The next member session appears on your dashboard with a countdown and join link. A full session archive will be added here."
        action={
          <ButtonLink href="/" variant="secondary" className="w-auto px-5">
            Back to Dashboard
          </ButtonLink>
        }
      />
    </main>
  );
}
