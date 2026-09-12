import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label, className }: { label: string; className?: string }) {
  return <Skeleton className={className ?? "h-40 rounded-xl"} aria-label={label} />;
}

export function KpiSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading summary">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5" aria-label="Loading table">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 rounded-lg" />
      ))}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      {onRetry ? (
        <div className="mx-auto mt-4 w-fit">
          <Button onClick={onRetry} className="px-6">
            Try Again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-edge bg-panel p-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>
    </div>
  );
}
