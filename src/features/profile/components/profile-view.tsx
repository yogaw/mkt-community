"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/datetime/format";
import { PREMIUM_PLAN, formatIdr, periodLabel } from "@/features/membership/membership-plan";
import { UpgradeMembershipDrawer } from "@/features/membership/components/upgrade-membership-drawer";
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
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
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

          <section
            aria-label="Membership"
            className="rounded-xl border border-edge bg-panel p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-faint">Current Membership</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{PREMIUM_PLAN.name}</p>
              </div>
              <StatusBadge
                label={statusBadgeConfig[profile.membershipStatus].label}
                tone={statusBadgeConfig[profile.membershipStatus].tone}
              />
            </div>

            {/* Member since is the account's own creation date. There is no
                renewal date in the system yet, so none is shown — inventing one
                on a billing screen would be worse than leaving it out. */}
            <dl className="mt-4 border-t border-edge pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Member since</dt>
                <dd className="font-medium text-ink">{formatDate(profile.joinedAt)}</dd>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <dt className="text-ink-muted">Price</dt>
                <dd className="font-medium text-ink">
                  {formatIdr(PREMIUM_PLAN.priceIdr)}{" "}
                  <span className="text-xs font-normal text-ink-faint">
                    {periodLabel(PREMIUM_PLAN)}
                  </span>
                </dd>
              </div>
            </dl>

            <ul className="mt-4 space-y-2 border-t border-edge pt-4">
              {PREMIUM_PLAN.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.2l2.2 2.2 4.8-4.8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button onClick={() => setIsUpgradeOpen(true)} className="mt-5">
              Upgrade Membership
            </Button>
          </section>

          <Button onClick={handleLogout} disabled={isLoggingOut} variant="secondary">
            {isLoggingOut ? "Logging out" : "Logout"}
          </Button>

          <UpgradeMembershipDrawer
            open={isUpgradeOpen}
            onClose={() => setIsUpgradeOpen(false)}
          />
        </div>
      ) : null}
    </main>
  );
}
