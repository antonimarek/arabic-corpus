"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/login/actions";
import { hideBottomNav, isMorePath, MORE_LINKS } from "@/lib/app-nav";

const TABS = [
  { href: "/today", label: "Today" },
  { href: "/", label: "Search" },
  { href: "/texts", label: "Texts" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!moreRef.current?.contains(target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreOpen]);

  if (hideBottomNav(pathname)) {
    return null;
  }

  const moreActive = isMorePath(pathname);

  return (
    <div ref={moreRef} className="md:hidden">
      {moreOpen ? (
        <div
          role="menu"
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-[var(--line)] bg-[var(--surface-raised)] py-1"
        >
          {MORE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block min-h-11 px-4 py-3 text-sm text-[var(--ink)]"
              onClick={() => setMoreOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full min-h-11 px-4 py-3 text-left text-sm text-[var(--ink-muted)]"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--background)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-3xl items-stretch">
          {TABS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 items-center justify-center px-1 text-center text-sm ${
                    active
                      ? "font-medium text-[var(--ink)]"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-current={moreActive ? "page" : undefined}
              className={`flex min-h-14 w-full items-center justify-center px-1 text-center text-sm ${
                moreActive || moreOpen
                  ? "font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)]"
              }`}
              onClick={() => setMoreOpen((open) => !open)}
            >
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
