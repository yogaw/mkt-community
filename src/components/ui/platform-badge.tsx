interface PlatformBadgeProps {
  label: string;
}

export function PlatformBadge({ label }: PlatformBadgeProps) {
  return (
    <span className="inline-block rounded-full bg-panel-raised px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
      {label}
    </span>
  );
}
