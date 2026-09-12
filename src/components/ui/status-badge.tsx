import { cn } from "@/lib/cn";

type StatusTone = "positive" | "warning";

const toneClasses: Record<StatusTone, string> = {
  positive: "bg-accent/10 text-accent",
  warning: "bg-warn/10 text-warn",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
