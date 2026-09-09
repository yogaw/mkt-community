export const ErrorCode = {
  validation: "general.error.validation",
  unauthorized: "general.error.unauthorized",
  forbidden: "general.error.forbidden",
  notFound: "general.error.not_found",
  serverError: "general.error.server_error",
  invalidCredentials: "auth.error.invalid_credentials",
  membershipInactive: "auth.error.membership_inactive",
} as const satisfies Record<string, string>;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
