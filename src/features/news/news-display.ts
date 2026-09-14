import type { CalendarEventKind, IdxDisclosureKind } from "@/features/news/news-types";

export const disclosureKindLabel: Record<IdxDisclosureKind, string> = {
  RUPS: "RUPS",
  DIVIDEND: "Dividend",
  MATERIAL_TRANSACTION: "Material Transaction",
  FINANCIAL_REPORT: "Financial Report",
  SHARE_BUYBACK: "Share Buyback",
  OTHER: "Other",
};

export const disclosureKindTone: Record<IdxDisclosureKind, string> = {
  RUPS: "bg-info/10 text-info",
  DIVIDEND: "bg-accent/10 text-accent",
  MATERIAL_TRANSACTION: "bg-alt/10 text-alt",
  FINANCIAL_REPORT: "bg-info/10 text-info",
  SHARE_BUYBACK: "bg-warn/10 text-warn",
  OTHER: "bg-panel-raised text-ink-muted",
};

export const calendarKindLabel: Record<CalendarEventKind, string> = {
  EARNINGS: "Earnings",
  DIVIDEND_EX_DATE: "Ex-Dividend",
  DIVIDEND_PAYMENT: "Dividend Payment",
  RUPS: "RUPS",
  IPO_LISTING: "IPO Listing",
  MACRO: "Macro",
  OTHER: "Other",
};

export const calendarKindTone: Record<CalendarEventKind, string> = {
  EARNINGS: "bg-info/10 text-info",
  DIVIDEND_EX_DATE: "bg-accent/10 text-accent",
  DIVIDEND_PAYMENT: "bg-accent/10 text-accent",
  RUPS: "bg-alt/10 text-alt",
  IPO_LISTING: "bg-warn/10 text-warn",
  MACRO: "bg-panel-raised text-ink-muted",
  OTHER: "bg-panel-raised text-ink-muted",
};
