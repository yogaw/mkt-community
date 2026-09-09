import { db } from "@/database";
import type { CategoryModel } from "@/database/prisma/models";

export interface CategoryRepository {
  findMany(): Promise<CategoryModel[]>;
}

export class PrismaCategoryRepository implements CategoryRepository {
  async findMany(): Promise<CategoryModel[]> {
    return db.category.findMany({ orderBy: { name: "asc" } });
  }
}

export const categoryRepository: CategoryRepository = new PrismaCategoryRepository();
