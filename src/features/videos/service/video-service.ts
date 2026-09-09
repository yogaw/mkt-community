import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import type { PaginatedResult } from "@/lib/api/pagination";
import { toCategoryDto, toVideoCardDto, toVideoDetailDto } from "@/features/videos/video-mappers";
import type { CategoryDto, VideoCardDto, VideoDetailDto, VideoFilter } from "@/features/videos/video-types";
import type { VideoRepository } from "@/features/videos/repository/video-repository";
import { videoRepository } from "@/features/videos/repository/video-repository";

export interface VideoListResult extends PaginatedResult<VideoCardDto> {
  categories: CategoryDto[];
}

export interface VideoService {
  listVideos(filter: VideoFilter): Promise<VideoListResult>;
  getVideoById(id: string): Promise<VideoDetailDto>;
}

export class VideoServiceImpl implements VideoService {
  constructor(private readonly repository: VideoRepository) {}

  async listVideos(filter: VideoFilter): Promise<VideoListResult> {
    const normalizedFilter: VideoFilter = {
      ...filter,
      search: filter.search?.trim().toLowerCase() || undefined,
    };

    const [page, categories] = await Promise.all([
      this.repository.findMany(normalizedFilter),
      this.repository.findManyCategoriesWithVideos(),
    ]);

    return {
      items: page.items.map(toVideoCardDto),
      pagination: page.pagination,
      categories: categories.map(toCategoryDto),
    };
  }

  async getVideoById(id: string): Promise<VideoDetailDto> {
    const video = await this.repository.findById(id);

    if (!video) {
      throw new AppError(404, ErrorCode.notFound);
    }

    return toVideoDetailDto(video);
  }
}

export const videoService: VideoService = new VideoServiceImpl(videoRepository);
