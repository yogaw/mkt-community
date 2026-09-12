import { db } from "@/database";
import type { CalendarEventModel, IdxDisclosureModel } from "@/database/prisma/models";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { CalendarQuery, DisclosuresQuery } from "@/features/news/news-types";

export interface NewsSectionRepository {
  findDisclosures(query: DisclosuresQuery): Promise<PaginatedResult<IdxDisclosureModel>>;
  findCalendarEvents(query: CalendarQuery): Promise<PaginatedResult<CalendarEventModel>>;
}

export class PrismaNewsSectionRepository implements NewsSectionRepository {
  async findDisclosures(query: DisclosuresQuery): Promise<PaginatedResult<IdxDisclosureModel>> {
    const where = {
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.search
        ? {
            OR: [
              { ticker: { contains: query.search, mode: "insensitive" as const } },
              { companyName: { contains: query.search, mode: "insensitive" as const } },
              { title: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [totalItems, items] = await Promise.all([
      db.idxDisclosure.count({ where }),
      db.idxDisclosure.findMany({
        where,
        orderBy: { disclosedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, pagination: toPagination(query, totalItems) };
  }

  async findCalendarEvents(query: CalendarQuery): Promise<PaginatedResult<CalendarEventModel>> {
    // Split on the start of today so an event happening today counts as upcoming.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isUpcoming = query.window === "upcoming";
    const where = {
      deletedAt: null,
      eventDate: isUpcoming ? { gte: startOfToday } : { lt: startOfToday },
    };

    const [totalItems, items] = await Promise.all([
      db.calendarEvent.count({ where }),
      db.calendarEvent.findMany({
        where,
        // Upcoming reads forward from today; past reads backward from yesterday.
        orderBy: { eventDate: isUpcoming ? "asc" : "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, pagination: toPagination(query, totalItems) };
  }
}

function toPagination(query: { page: number; pageSize: number }, totalItems: number) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / query.pageSize),
  };
}

export const newsSectionRepository: NewsSectionRepository = new PrismaNewsSectionRepository();
