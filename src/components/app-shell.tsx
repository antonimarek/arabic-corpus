"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Search" },
  { href: "/texts", label: "Texts" },
  { href: "/examples", label: "Examples" },
  { href: "/vocabulary", label: "Vocabulary" },
  { href: "/structures", label: "Structures" },
] as const;

const ADD_ITEMS = [
  { href: "/texts/new", label: "Text" },
  { href: "/examples/new", label: "Example" },
  { href: "/vocabulary/new", label: "Vocabulary" },
  { href: "/structures/new", label: "Structure" },
  { href: "/import", label: "Import" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="block">
            <span
              className="font-arabic text-xl leading-none text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              عربي
            </span>
            <span className="mt-1 block text-xs tracking-wide text-[var(--ink-muted)]">
              Levantine corpus
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={addRef}>
            <button
              type="button"
              onClick={() => setAddOpen((open) => !open)}
              className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)]"
              aria-expanded={addOpen}
              aria-haspopup="menu"
            >
              Add
            </button>
            {addOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 min-w-44 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1"
              >
                {ADD_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className="block px-3 py-3 text-sm text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                    onClick={() => setAddOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="min-h-11 min-w-11 rounded-md px-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="More"
            >
              ···
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 min-w-44 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1"
              >
                <Link
                  href="/admin"
                  role="menuitem"
                  className="block px-3 py-3 text-sm text-[var(--ink)] hover:bg-[var(--surface-hover)]"
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
        className="mb-8 flex gap-1 overflow-x-auto border-b border-[var(--line)] pb-px"
        aria-label="Main"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm transition-colors ${
                active
                  ? "border-[var(--accent)] text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1">{children}</div>
    </div>
  );
}
