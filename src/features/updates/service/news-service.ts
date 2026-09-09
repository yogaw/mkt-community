import type { PaginatedResult } from "@/lib/api/pagination";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { toNewsDetailDto, toNewsSummaryDto } from "@/features/updates/update-mappers";
import type { NewsDetailDto, NewsSummaryDto } from "@/features/updates/update-types";
import type { NewsRepository } from "@/features/updates/repository/news-repository";
import { newsRepository } from "@/features/updates/repository/news-repository";

export interface NewsService {
  getNewsById(id: string): Promise<NewsDetailDto>;
  listNews(page: number, pageSize: number): Promise<PaginatedResult<NewsSummaryDto>>;
}

export class NewsServiceImpl implements NewsService {
  constructor(private readonly repository: NewsRepository) {}

  async getNewsById(id: string): Promise<NewsDetailDto> {
    const news = await this.repository.findById(id);

    if (!news) {
      throw new AppError(404, ErrorCode.notFound);
    }

    return toNewsDetailDto(news);
  }

  async listNews(page: number, pageSize: number): Promise<PaginatedResult<NewsSummaryDto>> {
    const result = await this.repository.findMany(page, pageSize);

    return {
      items: result.items.map(toNewsSummaryDto),
      pagination: result.pagination,
    };
  }
}

export const newsService: NewsService = new NewsServiceImpl(newsRepository);
