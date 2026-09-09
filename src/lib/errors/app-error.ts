import { type ErrorCodeValue } from "./error-code";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCodeValue,
    readonly field: string = "general",
  ) {
    super(code);
    this.name = "AppError";
  }
}
