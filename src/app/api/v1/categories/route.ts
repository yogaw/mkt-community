import { NextResponse, type NextRequest } from "next/server";
import { categoryService } from "@/features/videos/service/category-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const categories = await categoryService.getCategories();

    return NextResponse.json({ data: categories }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
