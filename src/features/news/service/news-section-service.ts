import type { PaginatedResult } from "@/lib/api/pagination";
import type {
  CalendarEventDto,
  CalendarQuery,
  DisclosuresQuery,
  IdxDisclosureDto,
} from "@/features/news/news-types";
import type { NewsSectionRepository } from "@/features/news/repository/news-section-repository";
import { newsSectionRepository } from "@/features/news/repository/news-section-repository";
import {
  toCalendarEventDto,
  toIdxDisclosureDto,
} from "@/features/news/news-mappers";

export interface NewsSectionService {
  listDisclosures(query: DisclosuresQuery): Promise<PaginatedResult<IdxDisclosureDto>>;
  listCalendarEvents(query: CalendarQuery): Promise<PaginatedResult<CalendarEventDto>>;
}

export class NewsSectionServiceImpl implements NewsSectionService {
  constructor(private readonly repository: NewsSectionRepository) {}

  async listDisclosures(query: DisclosuresQuery): Promise<PaginatedResult<IdxDisclosureDto>> {
    const page = await this.repository.findDisclosures(query);
    return { items: page.items.map(toIdxDisclosureDto), pagination: page.pagination };
  }

  async listCalendarEvents(query: CalendarQuery): Promise<PaginatedResult<CalendarEventDto>> {
    const page = await this.repository.findCalendarEvents(query);
    return { items: page.items.map(toCalendarEventDto), pagination: page.pagination };
  }
}

export const newsSectionService: NewsSectionService = new NewsSectionServiceImpl(
  newsSectionRepository,
);
