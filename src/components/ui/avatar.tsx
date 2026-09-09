import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  /** Size and text classes come from the call site, e.g. "h-20 w-20 text-xl". */
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-edge bg-panel-raised font-semibold text-ink-muted",
        className,
      )}
    >
      {initials}
    </div>
  );
}
