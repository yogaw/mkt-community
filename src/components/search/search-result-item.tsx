import Link from "next/link";
import { TypeBadge } from "@/components/ui/type-badge";
import type { SearchResultItemDto } from "@/features/search/search-types";

const kindBadgeLabels: Record<SearchResultItemDto["kind"], string> = {
  video: "Video",
  news: "News",
  announcement: "Announcement",
};

const kindHref: Record<SearchResultItemDto["kind"], (id: string) => string> = {
  video: (id) => `/videos/${id}`,
  news: (id) => `/updates/news/${id}`,
  announcement: (id) => `/updates/announcements/${id}`,
};

export function SearchResultItem({ item }: { item: SearchResultItemDto }) {
  return (
    <Link
      href={kindHref[item.kind](item.id)}
      className="block rounded-xl border border-edge bg-panel p-4 transition-colors hover:border-ink-faint"
    >
      <TypeBadge label={kindBadgeLabels[item.kind]} />
      <h3 className="mt-2 font-medium text-ink">{item.title}</h3>
      {item.subtitle ? <p className="mt-1 text-sm text-ink-faint">{item.subtitle}</p> : null}
    </Link>
  );
}
