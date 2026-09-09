import { getToken } from "@/lib/auth/token-storage";

export type AuthedResult<T> =
  | { outcome: "unauthenticated" }
  | { outcome: "not-found" }
  | { outcome: "failed" }
  | { outcome: "loaded"; body: T };

/**
 * Fetches a protected API path with the stored access token.
 * Centralizes the 401 handling so every client view shares one
 * session-expiry behavior (clear storage, back to Login), and
 * distinguishes 404 so detail views can render their not-found state.
 */
export async function authedFetch<T>(path: string): Promise<AuthedResult<T>> {
  const token = getToken();
  if (!token) {
    return { outcome: "unauthenticated" };
  }

  try {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      return { outcome: "unauthenticated" };
    }
    if (response.status === 404) {
      return { outcome: "not-found" };
    }
    if (!response.ok) {
      return { outcome: "failed" };
    }

    return { outcome: "loaded", body: (await response.json()) as T };
  } catch {
    return { outcome: "failed" };
  }
}
