"use client";

import type { CategoryCountDto, DiscussionCategory } from "@/features/discussion/discussion-types";
import { DiscussionCategoryCard } from "./discussion-category-card";

/**
 * The map of the board. Selecting a card filters the feed; selecting the
 * selected one clears the filter, so there is always a way back to everything
 * without a sixth "All" card competing with the five rooms.
 *
 * Below lg the row scrolls sideways rather than squeezing: five cards in a
 * phone's width would wrap "Strategy & Psychology" onto four lines.
 */
export function DiscussionCategoryGrid({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryCountDto[];
  selected: DiscussionCategory | null;
  onSelect: (category: DiscussionCategory | null) => void;
}) {
  return (
    <ul
      className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-5"
      aria-label="Discussion categories"
    >
      {categories.map(({ category, threadCount }) => (
        <li key={category} className="snap-start">
          <DiscussionCategoryCard
            category={category}
            threadCount={threadCount}
            isSelected={selected === category}
            onSelect={() => onSelect(selected === category ? null : category)}
          />
        </li>
      ))}
    </ul>
  );
}
