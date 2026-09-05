export const MAIN_NAV = [
  { href: "/", label: "Search" },
  { href: "/texts", label: "Texts" },
  { href: "/examples", label: "Examples" },
  { href: "/vocabulary", label: "Vocabulary" },
  { href: "/patterns", label: "Patterns" },
  { href: "/structures", label: "Structures" },
] as const;

export const ADD_ITEMS = [
  { href: "/texts/new", label: "Text" },
  { href: "/examples/new", label: "Example" },
  { href: "/vocabulary/new", label: "Vocabulary" },
  { href: "/patterns/new", label: "Connect pattern" },
  { href: "/structures/new", label: "Structure" },
  { href: "/import", label: "Import" },
] as const;

export const MORE_LINKS = [
  { href: "/examples", label: "Examples" },
  { href: "/vocabulary", label: "Vocabulary" },
  { href: "/patterns", label: "Patterns" },
  { href: "/structures", label: "Structures" },
  { href: "/manual", label: "Manual" },
  { href: "/manual/sources", label: "Sources" },
  { href: "/admin", label: "Admin" },
] as const;

export function hideBottomNav(pathname: string): boolean {
  if (pathname === "/import" || pathname.startsWith("/import/")) {
    return true;
  }
  return pathname.endsWith("/new") || pathname.endsWith("/edit");
}

export function isMorePath(pathname: string): boolean {
  return MORE_LINKS.some(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
