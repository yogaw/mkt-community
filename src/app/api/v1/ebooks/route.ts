import { NextResponse, type NextRequest } from "next/server";
import { ebookService } from "@/features/ebooks/service/ebook-service";
import { createEbookSchema, ebooksQuerySchema } from "@/features/ebooks/ebook-types";
import { requireAdmin, requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { storeDocument } from "@/lib/uploads/storage";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const query = ebooksQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await ebookService.listEbooks(query);

    return NextResponse.json({ data: result.items, pagination: result.pagination }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Admin-only. Takes the PDF and its metadata in one multipart request. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new AppError(400, ErrorCode.validation, "file");
    }

    const input = createEbookSchema.parse({
      title: form?.get("title"),
      tag: form?.get("tag"),
      source: form?.get("source"),
      author: form?.get("author") ?? undefined,
      summary: form?.get("summary") ?? undefined,
      tickers: String(form?.get("tickers") ?? "")
        .split(",")
        .map((ticker) => ticker.trim())
        .filter(Boolean),
      publishedAt: form?.get("publishedAt"),
    });

    const fileName = await storeDocument(file);
    const ebook = await ebookService.createEbook(input, fileName, file.size);

    return NextResponse.json({ data: ebook }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
