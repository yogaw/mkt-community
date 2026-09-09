import { toCategoryDto } from "@/features/videos/video-mappers";
import type { CategoryDto } from "@/features/videos/video-types";
import type { VideoRepository } from "@/features/videos/repository/video-repository";
import { videoRepository } from "@/features/videos/repository/video-repository";

export interface CategoryService {
  getCategories(): Promise<CategoryDto[]>;
}

export class CategoryServiceImpl implements CategoryService {
  constructor(private readonly repository: VideoRepository) {}

  async getCategories(): Promise<CategoryDto[]> {
    const categories = await this.repository.findManyCategoriesWithVideos();
    return categories.map(toCategoryDto);
  }
}

export const categoryService: CategoryService = new CategoryServiceImpl(videoRepository);
