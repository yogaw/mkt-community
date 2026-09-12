"use client";

import { cn } from "@/lib/cn";
import { pluralize } from "@/features/discussion/discussion-display";
import { CATEGORY_STYLE } from "@/features/discussion/discussion-display";
import type { CategoryCountDto, DiscussionCategory } from "@/features/discussion/discussion-types";
import { CategoryIcon } from "./category-icon";

/**
 * The map of the board. Selecting a card filters the list; selecting the
 * selected one clears the filter, so there is always a way back to everything
 * without a separate "All" control competing with the five rooms.
 */
export function CategoryCards({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryCountDto[];
  selected: DiscussionCategory | null;
  onSelect: (category: DiscussionCategory | null) => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {categories.map(({ category, threadCount }) => {
        const style = CATEGORY_STYLE[category];
        const isSelected = selected === category;

        return (
          <li key={category}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : category)}
              className={cn(
                "flex h-full w-full flex-col justify-between gap-6 rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-transparent bg-ink text-canvas"
                  : cn("border-edge", style.tint, "hover:border-ink-faint"),
              )}
            >
              <CategoryIcon category={category} className="h-7 w-7" />
              <span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    isSelected ? "text-canvas" : "text-ink",
                  )}
                >
                  {style.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    isSelected ? "text-canvas/70" : "text-ink-faint",
                  )}
                >
                  {pluralize(threadCount, "discussion")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
