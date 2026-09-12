import { z } from "zod";

export const DEFAULT_NEWS_PAGE_SIZE = 12;

export type IdxDisclosureKind =
  | "RUPS"
  | "DIVIDEND"
  | "MATERIAL_TRANSACTION"
  | "FINANCIAL_REPORT"
  | "SHARE_BUYBACK"
  | "OTHER";

export type CalendarEventKind =
  | "EARNINGS"
  | "DIVIDEND_EX_DATE"
  | "DIVIDEND_PAYMENT"
  | "RUPS"
  | "IPO_LISTING"
  | "MACRO"
  | "OTHER";

export const disclosuresQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : undefined)),
  kind: z
    .enum(["RUPS", "DIVIDEND", "MATERIAL_TRANSACTION", "FINANCIAL_REPORT", "SHARE_BUYBACK", "OTHER"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(DEFAULT_NEWS_PAGE_SIZE),
});

export type DisclosuresQuery = z.infer<typeof disclosuresQuerySchema>;

export const calendarQuerySchema = z.object({
  /** "upcoming" looks forward from today; "past" looks back. */
  window: z.enum(["upcoming", "past"]).default("upcoming"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(DEFAULT_NEWS_PAGE_SIZE),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export interface IdxDisclosureDto {
  id: string;
  ticker: string;
  companyName: string;
  kind: IdxDisclosureKind;
  title: string;
  summary: string | null;
  documentUrl: string | null;
  disclosedAt: string;
}

export interface CalendarEventDto {
  id: string;
  ticker: string | null;
  title: string;
  kind: CalendarEventKind;
  detail: string | null;
  eventDate: string;
}
