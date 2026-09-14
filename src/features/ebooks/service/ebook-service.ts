import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { EbookModel } from "@/database/prisma/models";
import type { CreateEbookInput, EbookDto, EbooksQuery } from "@/features/ebooks/ebook-types";
import type { EbookRepository } from "@/features/ebooks/repository/ebook-repository";
import { ebookRepository } from "@/features/ebooks/repository/ebook-repository";

export interface EbookService {
  listEbooks(query: EbooksQuery): Promise<PaginatedResult<EbookDto>>;
  getFileName(id: string): Promise<{ fileName: string; title: string }>;
  createEbook(input: CreateEbookInput, fileName: string, fileSizeBytes: number): Promise<EbookDto>;
}

export class EbookServiceImpl implements EbookService {
  constructor(private readonly repository: EbookRepository) {}

  async listEbooks(query: EbooksQuery): Promise<PaginatedResult<EbookDto>> {
    const page = await this.repository.findMany(query);
    return { items: page.items.map(toEbookDto), pagination: page.pagination };
  }

  /**
   * The stored filename never reaches the client. Downloads go through the
   * ebook's id so the file is served only to a caller the route has
   * authenticated, and a leaked URL is useless without a token.
   */
  async getFileName(id: string): Promise<{ fileName: string; title: string }> {
    const ebook = await this.repository.findById(id);
    if (!ebook) {
      throw new AppError(404, ErrorCode.notFound);
    }
    return { fileName: ebook.fileName, title: ebook.title };
  }

  async createEbook(
    input: CreateEbookInput,
    fileName: string,
    fileSizeBytes: number,
  ): Promise<EbookDto> {
    return toEbookDto(await this.repository.create(input, fileName, fileSizeBytes));
  }
}

function toEbookDto(ebook: EbookModel): EbookDto {
  return {
    id: ebook.id,
    title: ebook.title,
    tag: ebook.tag,
    summary: ebook.summary,
    source: ebook.source,
    author: ebook.author,
    tickers: ebook.tickers,
    publishedAt: ebook.publishedAt.toISOString(),
    fileSizeBytes: ebook.fileSizeBytes,
    downloadPath: `/api/v1/ebooks/${ebook.id}/file`,
  };
}

export const ebookService: EbookService = new EbookServiceImpl(ebookRepository);
