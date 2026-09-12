"use client";

import { SORT_LABEL, THREAD_SORTS, type ThreadSort } from "@/features/discussion/discussion-types";

/** Sort only. Category is the card row above; anything more would be a screener. */
export function DiscussionFilters({
  sort,
  onSortChange,
}: {
  sort: ThreadSort;
  onSortChange: (sort: ThreadSort) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-ink-faint">
      Sort by
      <select
        value={sort}
        onChange={(event) => onSortChange(event.target.value as ThreadSort)}
        className="rounded-lg border border-edge bg-panel-raised px-2.5 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
      >
        {THREAD_SORTS.map((value) => (
          <option key={value} value={value}>
            {SORT_LABEL[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
