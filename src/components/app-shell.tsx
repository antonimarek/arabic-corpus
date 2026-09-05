"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/login/actions";
import { BottomNav } from "@/components/bottom-nav";
import { ADD_ITEMS, hideBottomNav, MAIN_NAV } from "@/lib/app-nav";
import type { BuildInfo } from "@/lib/build-info";

type AppShellProps = {
  children: React.ReactNode;
  buildInfo: BuildInfo;
};

export function AppShell({ children, buildInfo }: AppShellProps) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const showBottom = !hideBottomNav(pathname);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!addRef.current?.contains(target)) {
        setAddOpen(false);
      }
      if (!moreRef.current?.contains(target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const menuClass =
    "absolute right-0 z-20 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-soft)]";
  const menuItemClass =
    "block px-3 py-3 text-sm text-[var(--ink)] hover:bg-[var(--surface-hover)]";

  return (
    <div
      className={`mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pt-5 sm:px-6 sm:pt-8 ${
        showBottom ? "pb-24 md:pb-10" : "pb-10"
      }`}
    >
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div className="min-w-0">
          <Link href="/" className="block">
            <span
              className="font-arabic text-xl leading-none text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              عربي
            </span>
            <span className="mt-1.5 block text-xs tracking-wide text-[var(--ink-muted)]">
              Levantine corpus
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={addRef}>
            <button
              type="button"
              onClick={() => setAddOpen((open) => !open)}
              className="ui-btn-primary min-h-11 px-4"
              aria-expanded={addOpen}
              aria-haspopup="menu"
            >
              Add
            </button>
            {addOpen ? (
              <div role="menu" className={menuClass}>
                {ADD_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={menuItemClass}
                    onClick={() => setAddOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative hidden md:block" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)]"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
            </button>
            {moreOpen ? (
              <div role="menu" className={menuClass}>
                <Link
                  href="/manual"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMoreOpen(false)}
                >
                  Manual
                </Link>
                <Link
                  href="/manual/sources"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMoreOpen(false)}
                >
                  Sources
                </Link>
                <Link
                  href="/admin"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMoreOpen(false)}
                >
                  Admin
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="block w-full px-3 py-3 text-left text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        className="mb-8 hidden gap-1 overflow-x-auto pb-1 md:flex"
        aria-label="Main"
      >
        {MAIN_NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="mt-10 border-t border-[var(--line)] pt-4">
        <p className="text-[11px] tracking-wide text-[var(--ink-muted)]">
          Build {buildInfo.label}
        </p>
      </footer>
      <BottomNav />
    </div>
  );
}
