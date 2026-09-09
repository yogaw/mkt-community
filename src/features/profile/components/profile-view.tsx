"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { authedFetch } from "@/lib/api/authed-fetch";
import { clearSession, getToken } from "@/lib/auth/token-storage";
import type { ProfileDto } from "../profile-types";

type Status = "loading" | "ready" | "error";

const statusBadgeConfig: Record<ProfileDto["membershipStatus"], { label: string; tone: "positive" | "warning" }> = {
  ACTIVE: { label: "Active", tone: "positive" },
  INACTIVE: { label: "Inactive", tone: "warning" },
  EXPIRED: { label: "Expired", tone: "warning" },
};

export function ProfileView() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await authedFetch<{ data: ProfileDto }>("/api/v1/profile");
      if (cancelled) {
        return;
      }
      if (result.outcome === "unauthenticated") {
        clearSession();
        router.replace("/login");
        return;
      }
      if (result.outcome !== "loaded") {
        setStatus("error");
        return;
      }
      setProfile(result.body.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  async function handleLogout() {
    setIsLoggingOut(true);

    const token = getToken();
    if (token) {
      try {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Logout is client-side for MVP; ignore transport errors and clear anyway.
      }
    }

    clearSession();
    router.replace("/login");
  }

  function handleRetry() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  return (
    <main className="mx-auto w-full max-w-[420px] px-4 py-10 sm:px-6">
      {status === "loading" ? (
        <div className="rounded-xl border border-edge bg-panel p-8" aria-label="Loading profile">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="mt-8 h-10 w-full rounded-lg" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center">
          <p className="text-sm text-ink-muted">We could not load your profile. Please try again.</p>
          <Button onClick={handleRetry} className="mx-auto mt-4 w-auto px-6">
            Try Again
          </Button>
        </div>
      ) : null}

      {status === "ready" && profile ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-xl border border-edge bg-panel p-8 text-center">
            <Avatar name={profile.name} className="h-20 w-20 text-xl" />
            <h1 className="mt-4 text-xl font-semibold text-ink">{profile.name}</h1>
            <p className="mt-1 text-sm text-ink-faint">{profile.email}</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-edge bg-panel p-5">
            <span className="text-sm font-medium text-ink-muted">Membership</span>
            <StatusBadge
              label={statusBadgeConfig[profile.membershipStatus].label}
              tone={statusBadgeConfig[profile.membershipStatus].tone}
            />
          </div>

          <Button onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out" : "Logout"}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
