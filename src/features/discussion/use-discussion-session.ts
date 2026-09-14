"use client";

import { useSyncExternalStore } from "react";
import { isStoredUserAdmin } from "@/lib/auth/token-storage";

/** A session cannot change role without a fresh sign-in, so there is nothing
 *  to subscribe to. */
function subscribe(): () => void {
  return () => {};
}

/**
 * Whether the signed-in user is an admin, read hydration-safely.
 *
 * localStorage has no server snapshot, so this resolves false during render and
 * settles once hydrated — which is why it is a store rather than an effect.
 * It gates UI only; every admin route re-checks the role on the signed token.
 */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, isStoredUserAdmin, () => false);
}
