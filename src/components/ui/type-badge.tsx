interface TypeBadgeProps {
  label: string;
}

export function TypeBadge({ label }: TypeBadgeProps) {
  return (
    <span className="inline-block rounded-full bg-panel-raised px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-accent">
      {label}
    </span>
  );
}
