import type { PaginatedResult } from "@/lib/api/pagination";
import type { SearchResultItemDto } from "@/features/search/search-types";
import { DEFAULT_SEARCH_PAGE_SIZE } from "@/features/search/search-types";
import { toAnnouncementSearchItem, toNewsSearchItem, toVideoSearchItem } from "@/features/search/search-mappers";
import type { SearchRepository } from "@/features/search/repository/search-repository";
import { searchRepository } from "@/features/search/repository/search-repository";

export interface SearchService {
  search(query: string, page: number): Promise<PaginatedResult<SearchResultItemDto>>;
}

export class SearchServiceImpl implements SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async search(query: string, page: number): Promise<PaginatedResult<SearchResultItemDto>> {
    const term = query.trim();
    const pageSize = DEFAULT_SEARCH_PAGE_SIZE;

    if (!term) {
      return {
        items: [],
        pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 },
      };
    }

    // Fetch enough per type to fill the requested page after the merge.
    const perTypeLimit = page * pageSize;
    const [videos, news, announcements] = await Promise.all([
      this.repository.searchVideos(term, perTypeLimit),
      this.repository.searchNews(term, perTypeLimit),
      this.repository.searchAnnouncements(term, perTypeLimit),
    ]);

    const merged: SearchResultItemDto[] = [
      ...videos.map(toVideoSearchItem),
      ...news.map(toNewsSearchItem),
      ...announcements.map(toAnnouncementSearchItem),
    ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const start = (page - 1) * pageSize;

    return {
      items: merged.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: merged.length,
        totalPages: Math.ceil(merged.length / pageSize),
      },
    };
  }
}

export const searchService: SearchService = new SearchServiceImpl(searchRepository);
