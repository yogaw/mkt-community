import type { PaginatedResult } from "@/lib/api/pagination";
import { toUpdateFeedItem } from "@/features/updates/update-mappers";
import type { UpdateFeedItemDto, UpdatesFilter } from "@/features/updates/update-types";
import type { UpdatesRepository } from "@/features/updates/repository/updates-repository";
import { updatesRepository } from "@/features/updates/repository/updates-repository";

export interface UpdatesService {
  listUpdates(filter: UpdatesFilter): Promise<PaginatedResult<UpdateFeedItemDto>>;
}

export class UpdatesServiceImpl implements UpdatesService {
  constructor(private readonly repository: UpdatesRepository) {}

  async listUpdates(filter: UpdatesFilter): Promise<PaginatedResult<UpdateFeedItemDto>> {
    const page = await this.repository.findManyMerged(filter);

    return {
      items: page.items.map(toUpdateFeedItem),
      pagination: page.pagination,
    };
  }
}

export const updatesService: UpdatesService = new UpdatesServiceImpl(updatesRepository);
