"use client";

import { cn } from "@/lib/cn";
import { CATEGORY_STYLE, pluralize } from "@/features/discussion/discussion-display";
import type { DiscussionCategory } from "@/features/discussion/discussion-types";
import { CategoryIcon } from "./category-icon";

export function DiscussionCategoryCard({
  category,
  threadCount,
  isSelected,
  onSelect,
}: {
  category: DiscussionCategory;
  threadCount: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = CATEGORY_STYLE[category];

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "flex h-full w-full min-w-[13rem] flex-col justify-between gap-6 rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isSelected
          ? "border-transparent bg-ink text-canvas"
          : cn("border-edge", style.tint, "hover:border-ink-faint"),
      )}
    >
      <CategoryIcon category={category} className="h-7 w-7" />
      <span>
        <span className={cn("block text-sm font-semibold", isSelected ? "text-canvas" : "text-ink")}>
          {style.label}
        </span>
        <span
          className={cn("mt-0.5 block text-xs", isSelected ? "text-canvas/70" : "text-ink-faint")}
        >
          {pluralize(threadCount, "discussion")}
        </span>
      </span>
    </button>
  );
}
