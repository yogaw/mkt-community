import type { CalendarEventModel, IdxDisclosureModel } from "@/database/prisma/models";
import type { CalendarEventDto, IdxDisclosureDto } from "@/features/news/news-types";

export function toIdxDisclosureDto(disclosure: IdxDisclosureModel): IdxDisclosureDto {
  return {
    id: disclosure.id,
    ticker: disclosure.ticker,
    companyName: disclosure.companyName,
    kind: disclosure.kind,
    title: disclosure.title,
    summary: disclosure.summary,
    documentUrl: disclosure.documentUrl,
    disclosedAt: disclosure.disclosedAt.toISOString(),
  };
}

export function toCalendarEventDto(event: CalendarEventModel): CalendarEventDto {
  return {
    id: event.id,
    ticker: event.ticker,
    title: event.title,
    kind: event.kind,
    detail: event.detail,
    eventDate: event.eventDate.toISOString(),
  };
}
