import { Avatar } from "@/components/ui/avatar";
import { pluralize } from "@/features/discussion/discussion-display";
import type { ContributorDto } from "@/features/discussion/discussion-types";

/**
 * Ranked by replies written, not threads started.
 *
 * Someone who answers other people's questions is holding the board up;
 * someone who only posts their own is not, and counting threads would put them
 * in the same place.
 */
export function TopContributors({ contributors }: { contributors: ContributorDto[] }) {
  if (contributors.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Top Contributors</h2>
        <span className="shrink-0 text-xs text-ink-faint">By replies</span>
      </div>

      <ol className="mt-4 space-y-3">
        {contributors.map((contributor, index) => (
          <li key={contributor.id} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-sm font-semibold text-ink-faint">{index + 1}</span>
            <Avatar name={contributor.name} className="h-9 w-9 text-xs" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-ink">{contributor.name}</span>
                {contributor.isAdmin ? (
                  <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Admin
                  </span>
                ) : null}
              </span>
              <span className="block text-xs text-ink-faint">
                {pluralize(contributor.replyCount, "reply", "replies")}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
