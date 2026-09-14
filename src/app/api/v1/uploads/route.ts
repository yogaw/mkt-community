import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";
import { storeImage } from "@/lib/uploads/storage";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      throw new AppError(400, ErrorCode.validation, "file");
    }

    const name = await storeImage(file);

    return NextResponse.json({ data: { name, url: `/api/v1/uploads/${name}` } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
