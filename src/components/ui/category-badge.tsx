interface CategoryBadgeProps {
  label: string;
}

export function CategoryBadge({ label }: CategoryBadgeProps) {
  return (
    <span className="inline-block rounded-full border border-edge bg-panel-raised px-2.5 py-0.5 text-xs font-medium text-ink-muted">
      {label}
    </span>
  );
}
