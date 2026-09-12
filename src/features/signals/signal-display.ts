import type {
  SignalPositionSize,
  SignalRisk,
  SignalStatus,
  SignalType,
} from "@/features/signals/signal-types";

export const signalTypeLabel: Record<SignalType, string> = {
  SWING: "Swing",
  TRADING: "Trading",
  POSITION: "Position",
};

export const signalStatusLabel: Record<SignalStatus, string> = {
  ACTIVE: "Active",
  TP1_HIT: "TP1 Hit",
  TP2_HIT: "TP2 Hit",
  STOP_LOSS: "Stop Loss",
  CLOSED: "Closed",
};

export const signalRiskLabel: Record<SignalRisk, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const signalPositionSizeLabel: Record<SignalPositionSize, string> = {
  SMALL: "Small",
  NORMAL: "Normal",
  LARGE: "Large",
};

/** Three categorical tones, readable in both themes (see the info/alt tokens). */
export const signalTypeTone: Record<SignalType, string> = {
  SWING: "bg-info/10 text-info",
  TRADING: "bg-alt/10 text-alt",
  POSITION: "bg-accent/10 text-accent",
};

export const signalStatusTone: Record<SignalStatus, string> = {
  ACTIVE: "bg-accent/10 text-accent",
  TP1_HIT: "bg-accent/10 text-accent",
  TP2_HIT: "bg-accent/10 text-accent",
  STOP_LOSS: "bg-down/10 text-down",
  CLOSED: "bg-panel-raised text-ink-muted",
};

export const signalRiskTone: Record<SignalRisk, string> = {
  LOW: "text-accent",
  MEDIUM: "text-warn",
  HIGH: "text-down",
};

/** Always signed, always one decimal, so the column reads as a single number. */
export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function toReturnTone(value: number): string {
  if (value > 0) {
    return "text-accent";
  }
  return value < 0 ? "text-down" : "text-ink-muted";
}
