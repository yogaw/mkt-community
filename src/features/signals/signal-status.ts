import type { SignalStatus } from "@/features/signals/signal-types";

export interface SignalLevels {
  target1: number;
  target2: number | null;
  stopLoss: number;
}

/** Ordering of the open states, used to decide whether a close advances a signal. */
const openRank: Record<"ACTIVE" | "TP1_HIT" | "TP2_HIT", number> = {
  ACTIVE: 0,
  TP1_HIT: 1,
  TP2_HIT: 2,
};

/** What a single close implies on its own, with no regard for what came before.
 *  A close can never archive a signal, so CLOSED is not among the results. */
export function statusFromClose(
  close: number,
  levels: SignalLevels,
): Exclude<SignalStatus, "CLOSED"> {
  if (close <= levels.stopLoss) {
    return "STOP_LOSS";
  }
  if (levels.target2 !== null && close >= levels.target2) {
    return "TP2_HIT";
  }
  if (close >= levels.target1) {
    return "TP1_HIT";
  }
  return "ACTIVE";
}

/**
 * Folds a new close into the status a signal already has.
 *
 * Status only ever moves forward: a target once reached was profit actually
 * taken, so a later dip does not un-take it. The stop is the exception — it
 * bites from any open state, and both it and a manual close are terminal.
 */
export function advanceStatus(
  previous: SignalStatus,
  close: number,
  levels: SignalLevels,
): SignalStatus {
  if (previous === "CLOSED" || previous === "STOP_LOSS") {
    return previous;
  }

  const fromClose = statusFromClose(close, levels);
  if (fromClose === "STOP_LOSS") {
    return "STOP_LOSS";
  }

  return openRank[fromClose] > openRank[previous] ? fromClose : previous;
}

/** The status a brand-new signal opens at, given the close it was published with. */
export function initialStatus(close: number, levels: SignalLevels): SignalStatus {
  return advanceStatus("ACTIVE", close, levels);
}
