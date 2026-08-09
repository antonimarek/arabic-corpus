import Link from "next/link";
import type { ReactNode } from "react";

export type ArabicLink = {
  phrase: string;
  href: string;
  kind: "vocabulary" | "structure";
};

type Match = {
  start: number;
  end: number;
  link: ArabicLink;
};

function findMatches(text: string, links: ArabicLink[]): Match[] {
  const usable = links
    .filter((link) => link.phrase.trim().length > 0)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const matches: Match[] = [];
  const occupied: boolean[] = Array(text.length).fill(false);

  for (const link of usable) {
    const phrase = link.phrase;
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(phrase, from);
      if (index === -1) break;
      const end = index + phrase.length;
      let free = true;
      for (let i = index; i < end; i += 1) {
        if (occupied[i]) {
          free = false;
          break;
        }
      }
      if (free) {
        matches.push({ start: index, end, link });
        for (let i = index; i < end; i += 1) {
          occupied[i] = true;
        }
      }
      from = index + 1;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

export function renderLinkedArabic(
  text: string,
  links: ArabicLink[],
): ReactNode {
  if (!text) return null;
  if (links.length === 0) return text;

  const matches = findMatches(text, links);
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    nodes.push(
      <Link
        key={`${match.link.href}-${match.start}-${index}`}
        href={match.link.href}
        className={
          match.link.kind === "vocabulary"
            ? "linked-vocab"
            : "linked-structure"
        }
      >
        {text.slice(match.start, match.end)}
      </Link>,
    );
    cursor = match.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
