import Link from "next/link";
import { CATEGORY_STYLE, pluralize } from "@/features/discussion/discussion-display";
import { formatDate } from "@/lib/datetime/format";
import { cn } from "@/lib/cn";
import type { RelatedThreadDto } from "@/features/discussion/discussion-types";

/**
 * Relevance is computed, not curated: a shared ticker first, then a shared tag,
 * then the same category. If nothing matches, the card is absent rather than
 * padded out with whatever was published most recently.
 */
export function RelatedDiscussions({ related }: { related: RelatedThreadDto[] }) {
  if (related.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-edge bg-panel p-5">
      <h2 className="text-base font-semibold text-ink">Related Discussions</h2>

      <ul className="mt-3 divide-y divide-edge">
        {related.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/discussion/${thread.id}`}
              className="block py-3 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="block text-sm font-medium text-ink transition-colors hover:text-accent">
                {thread.title}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", CATEGORY_STYLE[thread.category].chip)}>
                  {CATEGORY_STYLE[thread.category].label}
                </span>
                <span>{pluralize(thread.commentCount, "comment")}</span>
                {thread.publishedAt ? <span>{formatDate(thread.publishedAt)}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
