import { cn } from "@/lib/cn";
import {
  signalStatusLabel,
  signalStatusTone,
  signalTypeLabel,
  signalTypeTone,
} from "@/features/signals/signal-display";
import type { SignalStatus, SignalType } from "@/features/signals/signal-types";

const badgeBase = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

export function SignalTypeBadge({ type }: { type: SignalType }) {
  return <span className={cn(badgeBase, signalTypeTone[type])}>{signalTypeLabel[type]}</span>;
}

export function SignalStatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span className={cn(badgeBase, signalStatusTone[status])}>
      <StatusIcon status={status} />
      {signalStatusLabel[status]}
    </span>
  );
}

function StatusIcon({ status }: { status: SignalStatus }) {
  if (status === "STOP_LOSS") {
    return (
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5l5.5 2.2v4c0 3.2-2.3 5.6-5.5 6.8-3.2-1.2-5.5-3.6-5.5-6.8v-4L8 1.5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "CLOSED") {
    return (
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.3 8h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}
