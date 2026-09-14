import type { SignalModel, SignalEventModel } from "@/database/prisma/models";
import type {
  SignalDetailDto,
  SignalEventDto,
  SignalRowDto,
} from "@/features/signals/signal-types";

/**
 * Return is measured from the low end of the entry range to the current price.
 * One formula for every row, so a number in the table can always be re-derived
 * from the entry and current price shown beside it.
 */
export function toReturnPercent(signal: SignalModel): number {
  return round((signal.currentPrice - signal.entryLow) / signal.entryLow);
}

function round(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}

function upsidePercent(from: number, to: number): number {
  return round((to - from) / from);
}

export function toSignalRowDto(signal: SignalModel, isWatchlisted: boolean): SignalRowDto {
  return {
    id: signal.id,
    ticker: signal.ticker,
    companyName: signal.companyName,
    type: signal.type,
    entryLow: signal.entryLow,
    entryHigh: signal.entryHigh,
    currentPrice: signal.currentPrice,
    target1: signal.target1,
    target2: signal.target2,
    stopLoss: signal.stopLoss,
    status: signal.status,
    returnPercent: toReturnPercent(signal),
    issuedAt: signal.issuedAt.toISOString(),
    isWatchlisted,
  };
}

export function toSignalEventDto(event: SignalEventModel): SignalEventDto {
  return {
    id: event.id,
    kind: event.kind,
    state: event.state,
    title: event.title,
    detail: event.detail,
    occurredAt: event.occurredAt?.toISOString() ?? null,
  };
}

export function toSignalDetailDto(
  signal: SignalModel & { event: SignalEventModel[] },
  isWatchlisted: boolean,
): SignalDetailDto {
  return {
    ...toSignalRowDto(signal, isWatchlisted),
    riskReward: signal.riskReward,
    timeHorizon: signal.timeHorizon,
    thesis: signal.thesis,
    chartImages: signal.chartImages,
    keyCatalysts: signal.keyCatalysts,
    target1UpsidePercent: upsidePercent(signal.currentPrice, signal.target1),
    target2UpsidePercent:
      signal.target2 === null ? null : upsidePercent(signal.currentPrice, signal.target2),
    stopLossDownsidePercent: upsidePercent(signal.currentPrice, signal.stopLoss),
    closedAt: signal.closedAt?.toISOString() ?? null,
    timeline: signal.event.map(toSignalEventDto),
  };
}
