import { getToken } from "@/lib/auth/token-storage";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import type { ThreadDetailDto } from "@/features/discussion/discussion-types";

export type MutationResult =
  | { outcome: "ok"; thread: ThreadDetailDto }
  | { outcome: "unauthenticated" }
  | { outcome: "failed"; message: string };

/**
 * Every discussion mutation answers with the whole thread.
 *
 * One shape for likes, follows, comments and moderation means the page never
 * patches its own state from a guess about what the server did — it replaces
 * what it has with what came back, so the counts on screen are the counts in
 * the database.
 */
export async function mutateThread(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  payload?: unknown,
): Promise<MutationResult> {
  const token = getToken();
  if (!token) {
    return { outcome: "unauthenticated" };
  }

  try {
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    if (response.status === 401) {
      return { outcome: "unauthenticated" };
    }
    if (!response.ok) {
      return { outcome: "failed", message: messageForStatus(response.status) };
    }

    const body = (await response.json()) as { data: ThreadDetailDto };
    return { outcome: "ok", thread: body.data };
  } catch {
    return { outcome: "failed", message: humanizeErrorCode("general.error.server_error") };
  }
}

function messageForStatus(status: number): string {
  if (status === 403) {
    return humanizeErrorCode("general.error.forbidden");
  }
  if (status === 400 || status === 422) {
    return humanizeErrorCode("general.error.validation");
  }
  return humanizeErrorCode("general.error.server_error");
}
