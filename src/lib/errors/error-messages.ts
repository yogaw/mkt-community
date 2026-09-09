import { ErrorCode } from "./error-code";

const errorMessage: Record<string, string> = {
  [ErrorCode.validation]: "Please check this field.",
  [ErrorCode.unauthorized]: "Please sign in to continue.",
  [ErrorCode.forbidden]: "You do not have access to this resource.",
  [ErrorCode.notFound]: "The requested content was not found.",
  [ErrorCode.serverError]: "Something went wrong. Please try again.",
  [ErrorCode.invalidCredentials]: "Invalid email or password.",
  [ErrorCode.membershipInactive]: "Your membership is not active.",
};

export function humanizeErrorCode(code: string): string {
  return errorMessage[code] ?? errorMessage[ErrorCode.serverError];
}
