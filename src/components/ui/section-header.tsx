import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}

export function SectionHeader({ title, actionLabel, actionHref }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
