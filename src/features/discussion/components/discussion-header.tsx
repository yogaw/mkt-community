"use client";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

/**
 * The New Discussion button is rendered only for admins, and the endpoint
 * behind it refuses everyone else. Hiding it is the courtesy; the 403 is the
 * rule.
 */
export function DiscussionHeader({
  search,
  onSearchChange,
  canCreate,
  onCreate,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Discussions</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Curated conversations to help you become a better investor.
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
          <SearchInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search discussions..."
            aria-label="Search discussions"
            className="py-2 text-sm"
          />
        </div>
        {canCreate ? (
          <div className="shrink-0">
            <Button onClick={onCreate} className="px-4">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New Discussion
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
