import { db } from "../src/database";
import {
  CalendarEventKind,
  IdxDisclosureKind,
} from "../src/database/prisma/enums";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Relative to run time so the calendar always has a believable future. */
function daysFromNow(days: number, hour = 9): Date {
  const date = new Date(Date.now() + days * DAY_IN_MS);
  date.setUTCHours(hour - 7, 0, 0, 0); // WIB is UTC+7
  return date;
}

const disclosures: Array<{
  id: string;
  ticker: string;
  companyName: string;
  kind: IdxDisclosureKind;
  title: string;
  summary: string;
  daysAgo: number;
}> = [
  {
    id: "disc-bbri-dividend",
    ticker: "BBRI",
    companyName: "Bank Rakyat Indonesia (Persero) Tbk",
    kind: IdxDisclosureKind.DIVIDEND,
    title: "Notice of cash dividend distribution for financial year 2025",
    summary:
      "The company will distribute a cash dividend of Rp 178 per share. Cum-dividend in the regular market falls next week, with payment scheduled for the end of the month.",
    daysAgo: 1,
  },
  {
    id: "disc-amman-transaction",
    ticker: "AMMN",
    companyName: "Amman Mineral Internasional Tbk",
    kind: IdxDisclosureKind.MATERIAL_TRANSACTION,
    title: "Disclosure of material transaction: smelter expansion financing",
    summary:
      "The company has signed a facility agreement to fund the next phase of smelter capacity. The transaction value falls below the threshold requiring shareholder approval.",
    daysAgo: 2,
  },
  {
    id: "disc-tlkm-report",
    ticker: "TLKM",
    companyName: "Telkom Indonesia (Persero) Tbk",
    kind: IdxDisclosureKind.FINANCIAL_REPORT,
    title: "Submission of interim financial statements",
    summary:
      "Unaudited interim statements have been submitted. Data revenue grew while legacy voice continued its expected decline.",
    daysAgo: 3,
  },
  {
    id: "disc-asii-rups",
    ticker: "ASII",
    companyName: "Astra International Tbk",
    kind: IdxDisclosureKind.RUPS,
    title: "Notice of Extraordinary General Meeting of Shareholders",
    summary:
      "An extraordinary meeting has been called to approve changes to the board composition. The agenda and proxy materials are attached to the filing.",
    daysAgo: 4,
  },
  {
    id: "disc-untr-buyback",
    ticker: "UNTR",
    companyName: "United Tractors Tbk",
    kind: IdxDisclosureKind.SHARE_BUYBACK,
    title: "Realisation report of share buyback programme",
    summary:
      "The company reported the shares repurchased during the period under the buyback mandate approved by shareholders.",
    daysAgo: 6,
  },
  {
    id: "disc-cuan-transaction",
    ticker: "CUAN",
    companyName: "Petrindo Jaya Kreasi Tbk",
    kind: IdxDisclosureKind.MATERIAL_TRANSACTION,
    title: "Acquisition of additional interest in a coal concession",
    summary:
      "The company disclosed the acquisition of an additional participating interest in an operating concession, funded internally.",
    daysAgo: 8,
  },
  {
    id: "disc-mdka-rups",
    ticker: "MDKA",
    companyName: "Merdeka Copper Gold Tbk",
    kind: IdxDisclosureKind.RUPS,
    title: "Summary of resolutions of the Annual General Meeting",
    summary:
      "Shareholders approved the annual report, the appropriation of profit, and the reappointment of the public accountant.",
    daysAgo: 11,
  },
  {
    id: "disc-pgas-report",
    ticker: "PGAS",
    companyName: "Perusahaan Gas Negara Tbk",
    kind: IdxDisclosureKind.FINANCIAL_REPORT,
    title: "Clarification on news coverage regarding distribution volumes",
    summary:
      "In response to an exchange query, the company clarified reported figures on gas distribution volumes for the period.",
    daysAgo: 14,
  },
];

const calendarEvents: Array<{
  id: string;
  ticker: string | null;
  title: string;
  kind: CalendarEventKind;
  detail: string;
  inDays: number;
}> = [
  { id: "cal-bi-rate", ticker: null, title: "Bank Indonesia rate decision", kind: CalendarEventKind.MACRO, detail: "Monthly Board of Governors meeting; policy rate announcement in the afternoon.", inDays: 2 },
  { id: "cal-bbri-ex", ticker: "BBRI", title: "BBRI ex-dividend date", kind: CalendarEventKind.DIVIDEND_EX_DATE, detail: "Rp 178 per share. Buyers from this date are not entitled to the dividend.", inDays: 4 },
  { id: "cal-tlkm-earnings", ticker: "TLKM", title: "TLKM quarterly results", kind: CalendarEventKind.EARNINGS, detail: "Release after market close, followed by an analyst call.", inDays: 6 },
  { id: "cal-inflation", ticker: null, title: "Inflation data release", kind: CalendarEventKind.MACRO, detail: "BPS publishes monthly CPI figures at 11:00 WIB.", inDays: 8 },
  { id: "cal-asii-rups", ticker: "ASII", title: "ASII extraordinary shareholders meeting", kind: CalendarEventKind.RUPS, detail: "Board composition changes on the agenda.", inDays: 11 },
  { id: "cal-bbri-pay", ticker: "BBRI", title: "BBRI dividend payment", kind: CalendarEventKind.DIVIDEND_PAYMENT, detail: "Cash distribution to entitled shareholders.", inDays: 15 },
  { id: "cal-ammn-earnings", ticker: "AMMN", title: "AMMN quarterly results", kind: CalendarEventKind.EARNINGS, detail: "Copper output and smelter ramp progress in focus.", inDays: 18 },
  { id: "cal-ipo-listing", ticker: null, title: "New listing on the main board", kind: CalendarEventKind.IPO_LISTING, detail: "A consumer sector issuer begins trading after its public offering.", inDays: 22 },
  { id: "cal-untr-earnings", ticker: "UNTR", title: "UNTR quarterly results", kind: CalendarEventKind.EARNINGS, detail: "Heavy equipment volumes and gold segment contribution.", inDays: 26 },
  // A little history, so the "Past" view is not empty.
  { id: "cal-past-bi", ticker: null, title: "Bank Indonesia rate decision", kind: CalendarEventKind.MACRO, detail: "Rate held at the previous level.", inDays: -28 },
  { id: "cal-past-mdka", ticker: "MDKA", title: "MDKA annual shareholders meeting", kind: CalendarEventKind.RUPS, detail: "All agenda items approved.", inDays: -12 },
  { id: "cal-past-gdp", ticker: null, title: "Quarterly GDP release", kind: CalendarEventKind.MACRO, detail: "Growth came in slightly ahead of consensus.", inDays: -5 },
];

export async function seedNewsSections(): Promise<void> {
  for (const disclosure of disclosures) {
    const { daysAgo, ...data } = disclosure;
    const disclosedAt = daysFromNow(-daysAgo, 16);
    await db.idxDisclosure.upsert({
      where: { id: disclosure.id },
      update: { ...data, disclosedAt },
      create: { ...data, disclosedAt },
    });
  }
  console.log(`Seeded ${disclosures.length} IDX disclosures`);

  for (const event of calendarEvents) {
    const { inDays, ...data } = event;
    const eventDate = daysFromNow(inDays);
    await db.calendarEvent.upsert({
      where: { id: event.id },
      update: { ...data, eventDate },
      create: { ...data, eventDate },
    });
  }
  console.log(`Seeded ${calendarEvents.length} calendar events`);
}
