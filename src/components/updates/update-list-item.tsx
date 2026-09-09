import Link from "next/link";
import { TypeBadge } from "@/components/ui/type-badge";
import type { UpdateFeedItemDto } from "@/features/updates/update-types";
import { formatRelativeTime } from "@/lib/datetime/format";

interface UpdateListItemProps {
  update: UpdateFeedItemDto;
  showSnippet?: boolean;
}

export function UpdateListItem({ update, showSnippet = false }: UpdateListItemProps) {
  const href =
    update.kind === "news" ? `/updates/news/${update.id}` : `/updates/announcements/${update.id}`;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-edge bg-panel p-4 transition-colors hover:border-ink-faint"
    >
      <div className="flex items-center justify-between gap-3">
        <TypeBadge label={update.badgeLabel} />
        <span className="shrink-0 text-xs text-ink-faint">{formatRelativeTime(update.publishedAt)}</span>
      </div>
      <h3 className="mt-2 font-medium text-ink">{update.title}</h3>
      {showSnippet && update.snippet ? (
        <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{update.snippet}</p>
      ) : null}
    </Link>
  );
}
