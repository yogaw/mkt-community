import type { Metadata } from "next";
import Link from "next/link";
import { GuidelinesBody } from "@/features/discussion/components/guidelines-body";

export const metadata: Metadata = {
  title: "Community Guidelines — Piranha",
  description: "How the Piranha discussion board works, and what is expected on it.",
};

export default function GuidelinesPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
      <Link
        href="/discussion"
        className="inline-block text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        &larr; Back to Discussions
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        Community Guidelines
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        How this board works, and what is expected of everyone on it.
      </p>

      <div className="mt-6">
        <GuidelinesBody />
      </div>
    </main>
  );
}
