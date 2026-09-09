import type { PaginatedResult } from "@/lib/api/pagination";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { toAnnouncementDetailDto, toAnnouncementSummaryDto } from "@/features/updates/update-mappers";
import type { AnnouncementDetailDto, AnnouncementSummaryDto } from "@/features/updates/update-types";
import type { AnnouncementRepository } from "@/features/updates/repository/announcement-repository";
import { announcementRepository } from "@/features/updates/repository/announcement-repository";

export interface AnnouncementService {
  getAnnouncementById(id: string): Promise<AnnouncementDetailDto>;
  listAnnouncements(page: number, pageSize: number): Promise<PaginatedResult<AnnouncementSummaryDto>>;
}

export class AnnouncementServiceImpl implements AnnouncementService {
  constructor(private readonly repository: AnnouncementRepository) {}

  async getAnnouncementById(id: string): Promise<AnnouncementDetailDto> {
    const announcement = await this.repository.findById(id);

    if (!announcement) {
      throw new AppError(404, ErrorCode.notFound);
    }

    return toAnnouncementDetailDto(announcement);
  }

  async listAnnouncements(page: number, pageSize: number): Promise<PaginatedResult<AnnouncementSummaryDto>> {
    const result = await this.repository.findMany(page, pageSize);

    return {
      items: result.items.map(toAnnouncementSummaryDto),
      pagination: result.pagination,
    };
  }
}

export const announcementService: AnnouncementService = new AnnouncementServiceImpl(announcementRepository);
