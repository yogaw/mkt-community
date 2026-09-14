import { cn } from "@/lib/cn";
import type { SignalEventDto, SignalEventState } from "@/features/signals/signal-types";

const stateDot: Record<SignalEventState, string> = {
  DONE: "bg-accent",
  PENDING: "bg-ink-faint/40",
  ACTIVE: "bg-down",
};

const stateBadge: Record<SignalEventState, string> = {
  DONE: "bg-accent/10 text-accent",
  PENDING: "bg-panel-raised text-ink-faint",
  ACTIVE: "bg-down/10 text-down",
};

const stateLabel: Record<SignalEventState, string> = {
  DONE: "Done",
  PENDING: "Pending",
  ACTIVE: "Active",
};

function formatStamp(value: string): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${day}, ${time}`;
}

export function SignalTimeline({ timeline }: { timeline: SignalEventDto[] }) {
  if (timeline.length === 0) {
    return <p className="text-sm text-ink-faint">No timeline entries yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {timeline.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pl-1">
          {index < timeline.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute left-[7px] top-4 h-full w-px bg-edge"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn("relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full", stateDot[event.state])}
          />
          <div className="min-w-0 flex-1">
            {event.occurredAt ? (
              <p className="text-xs text-ink-faint">{formatStamp(event.occurredAt)}</p>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{event.title}</p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  stateBadge[event.state],
                )}
              >
                {stateLabel[event.state]}
              </span>
            </div>
            {event.detail ? (
              <p className="mt-0.5 text-sm text-ink-muted">{event.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
