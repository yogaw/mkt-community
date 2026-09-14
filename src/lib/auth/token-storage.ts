const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export type StoredUserRole = "MEMBER" | "ADMIN";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  /** Optional: a session stored before roles were surfaced has no role, and
   *  falls back to member-level UI. Server routes enforce the real role. */
  role?: StoredUserRole;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable (private mode, blocked site data) — session stays in memory only
  }
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — dashboard falls back to a plain greeting
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Gates admin-only UI. This is display logic only — it reads localStorage,
 * which the user can edit; every admin route re-checks the signed token.
 */
export function isStoredUserAdmin(): boolean {
  return getStoredUser()?.role === "ADMIN";
}
