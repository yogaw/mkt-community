/**
 * House rules, shown beside the board rather than buried in a pinned thread.
 *
 * Static copy on purpose — these change rarely, and a rule that can be edited
 * without anyone noticing is not much of a rule. The full version lives in the
 * pinned thread, which is where the link goes.
 */
const RULES = [
  "Be respectful and constructive",
  "Stay on topic",
  "No stock pumping or misleading information",
  "Share insights, not just opinions",
  "Signals are ideas, not instructions — size them yourself",
];

export function CommunityRules({ onOpenGuidelines }: { onOpenGuidelines: () => void }) {
  return (
    <section className="rounded-xl border border-edge bg-panel p-5">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-ink">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent"
        >
          <path d="M12 3l7.5 3v5.5c0 4.4-3 8.2-7.5 9.5-4.5-1.3-7.5-5.1-7.5-9.5V6L12 3z" />
          <path d="M9.2 12l2 2 3.6-3.8" />
        </svg>
        Community Rules
      </h2>

      <ol className="mt-4 space-y-2.5">
        {RULES.map((rule, index) => (
          <li key={rule} className="flex gap-3 text-sm text-ink-muted">
            <span className="shrink-0 font-semibold text-ink-faint">{index + 1}.</span>
            {rule}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onOpenGuidelines}
        className="mt-4 text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
      >
        Read full guidelines &rarr;
      </button>
    </section>
  );
}
