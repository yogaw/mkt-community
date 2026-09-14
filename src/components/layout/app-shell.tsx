"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/signals", label: "Signals" },
  { href: "/stock-analysis", label: "Stock Analysis" },
  { href: "/market-data", label: "Market Data" },
  { href: "/discussion", label: "Discussion" },
  { href: "/videos", label: "Videos" },
  { href: "/news", label: "News" },
  { href: "/profile", label: "Profile" },
];

const pageTitleRules: Array<{ prefix: string; title: string }> = [
  { prefix: "/videos", title: "Videos" },
  { prefix: "/updates", title: "Updates" },
  { prefix: "/signals", title: "Signals" },
  { prefix: "/stock-analysis", title: "Stock Analysis" },
  { prefix: "/discussion", title: "Discussion" },
  { prefix: "/news", title: "News" },
  { prefix: "/market-data", title: "Market Data" },
  { prefix: "/search", title: "Search" },
  { prefix: "/profile", title: "Profile" },
];

function resolvePageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
  }
  return pageTitleRules.find((rule) => pathname.startsWith(rule.prefix))?.title ?? "Piranha";
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [term, setTerm] = useState("");

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) {
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-screen md:flex">
      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={closeMenu} aria-hidden="true" />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-edge bg-panel transition-transform duration-200",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          isMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink" onClick={closeMenu}>
            Piranha
          </Link>
        </div>
        <nav aria-label="Main navigation" className="px-3 pb-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-panel-raised text-accent"
                        : "text-ink-muted hover:bg-panel-raised hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-edge bg-canvas/95 px-4 backdrop-blur sm:gap-4 sm:px-6">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg border border-edge bg-panel p-2 text-ink-muted hover:text-ink md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{resolvePageTitle(pathname)}</h1>

          <form onSubmit={handleSearchSubmit} role="search" className="ml-auto hidden w-full max-w-xs sm:flex">
            <SearchInput
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search stocks, signals, videos..."
              aria-label="Search"
              className="py-2 text-sm"
            />
          </form>

          <ThemeToggle className="ml-auto sm:ml-0" />

          <Link href="/profile" aria-label="Open profile" className="shrink-0">
            <Image
              src="/avatar-placeholder.svg"
              alt="Your account"
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-full border border-edge"
            />
          </Link>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
