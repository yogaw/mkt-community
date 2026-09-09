import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";

export interface ApiErrorBody {
  path: string[];
  message: string;
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: toApiErrors(error) }, { status: 400 });
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: [{ path: [error.field], message: error.code }] },
      { status: error.status },
    );
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: [{ path: ["general"], message: ErrorCode.serverError }] },
    { status: 500 },
  );
}

function toApiErrors(error: ZodError): ApiErrorBody[] {
  return error.issues.map((issue) => ({
    path: [issue.path.length > 0 ? String(issue.path[0]) : "general"],
    message: ErrorCode.validation,
  }));
}
