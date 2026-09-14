import { cn } from "@/lib/cn";
import type { DiscussionCategory } from "@/features/discussion/discussion-types";

/*
 * One mark per category.
 *
 * These double as the thread-row thumbnail. The design they come from used
 * stock photography there, which would mean either shipping images nobody
 * chose for the thread or letting authors upload one — a whole feature the
 * board has not asked for. The category mark carries the same visual rhythm
 * and is always about the thread it sits beside.
 */
const PATHS: Record<DiscussionCategory, React.ReactNode> = {
  MARKET_OUTLOOK: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5z" />
    </>
  ),
  STOCK_DISCUSSION: (
    <>
      <path d="M4 19.5h16" />
      <path d="M7 19.5V11M12 19.5V6M17 19.5v-5.5" />
    </>
  ),
  MACRO_ECONOMY: (
    <>
      <path d="M3.5 9.5L12 4l8.5 5.5" />
      <path d="M5.5 9.5v9M18.5 9.5v9M9.5 9.5v9M14.5 9.5v9" />
      <path d="M3.5 19.5h17" />
    </>
  ),
  SECTOR_ANALYSIS: (
    <>
      <path d="M19.5 4.5c0 8-4.6 12-9.5 12a5.4 5.4 0 01-5.4-5.4C4.6 7 9.5 4.5 19.5 4.5z" />
      <path d="M5 19.5c3.5-4.6 6.8-7.2 11-9" />
    </>
  ),
  STRATEGY_PSYCHOLOGY: (
    <>
      <path d="M12 5.2a3.2 3.2 0 00-3.1 2.5A3 3 0 007 13a3 3 0 001.9 3.3 3.1 3.1 0 003.1 2.5" />
      <path d="M12 5.2a3.2 3.2 0 013.1 2.5A3 3 0 0117 13a3 3 0 01-1.9 3.3 3.1 3.1 0 01-3.1 2.5" />
      <path d="M12 5.2v13.6" />
    </>
  ),
};

export function CategoryIcon({
  category,
  className,
}: {
  category: DiscussionCategory;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      {PATHS[category]}
    </svg>
  );
}
