"use client";

import { Avatar } from "@/components/ui/avatar";
import { pluralize } from "@/features/discussion/discussion-display";
import type { ContributorDto } from "@/features/discussion/discussion-types";
import { AdminBadge } from "./badges";

/**
 * Ranked by comments written.
 *
 * On a board where only admins start threads, comments are the whole of member
 * participation — so they are the only honest thing to rank by. No points, no
 * badges, no levels: a participation ranking is enough.
 */
export function TopContributorsCard({
  contributors,
  onViewAll,
}: {
  contributors: ContributorDto[];
  onViewAll: () => void;
}) {
  if (contributors.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Top Contributors</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded text-sm font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          View All
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {contributors.map((contributor, index) => (
          <ContributorRow key={contributor.id} contributor={contributor} rank={index + 1} />
        ))}
      </ol>
    </section>
  );
}

export function ContributorRow({
  contributor,
  rank,
}: {
  contributor: ContributorDto;
  rank: number;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-5 shrink-0 text-sm font-semibold text-ink-faint">{rank}</span>
      <Avatar name={contributor.name} className="h-9 w-9 text-xs" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-ink">{contributor.name}</span>
          {contributor.isAdmin ? <AdminBadge title={null} /> : null}
        </span>
        <span className="block text-xs text-ink-faint">
          {pluralize(contributor.commentCount, "comment")}
        </span>
      </span>
    </li>
  );
}
