import type { ReactNode } from "react";

import {
  peelClitic,
  phraseMatchKey,
  tokenizeArabic,
} from "@/lib/match-arabic";

export type ArabicLinkKind = "vocabulary" | "structure" | "known";

export type ArabicLink = {
  phrase: string;
  href: string;
  kind: ArabicLinkKind;
  gloss?: string;
  matchKeys?: string[];
};

export type PhraseActivateHandler = (
  link: ArabicLink,
  rect: DOMRect,
  surface: string,
) => void;

type Match = {
  start: number;
  end: number;
  link: ArabicLink;
  surface: string;
};

function kindRank(kind: ArabicLinkKind): number {
  if (kind === "vocabulary") return 0;
  if (kind === "structure") return 1;
  return 2;
}

function linkKeys(link: ArabicLink): string[] {
  const keys = new Set<string>();
  const phraseKey = phraseMatchKey(link.phrase);
  if (phraseKey) keys.add(phraseKey);
  for (const key of link.matchKeys ?? []) {
    const normalized = phraseMatchKey(key) ?? key;
    if (normalized) keys.add(normalized);
  }
  return [...keys];
}

function windowKey(
  tokens: { key: string | null; surface: string }[],
  from: number,
  count: number,
): string | null {
  if (count === 1) {
    return tokens[from]?.key ?? null;
  }
  const surfaces = tokens.slice(from, from + count).map((token) => token.surface);
  return phraseMatchKey(surfaces.join(" "));
}

export function findMatches(text: string, links: ArabicLink[]): Match[] {
  if (!text || links.length === 0) return [];
  const tokens = tokenizeArabic(text);
  if (tokens.length === 0) return [];

  const usable = links
    .map((link) => {
      const keys = linkKeys(link);
      const phraseTokens = tokenizeArabic(link.phrase);
      return {
        link,
        keys,
        tokenCount: Math.max(phraseTokens.length, 1),
      };
    })
    .filter((entry) => entry.keys.length > 0)
    .sort((a, b) => {
      const len = b.link.phrase.length - a.link.phrase.length;
      if (len !== 0) return len;
      return kindRank(a.link.kind) - kindRank(b.link.kind);
    });

  const matches: Match[] = [];
  const occupied = Array(tokens.length).fill(false);

  for (const entry of usable) {
    const count = entry.tokenCount;
    if (count > tokens.length) continue;
    const keySet = new Set(entry.keys);

    for (let i = 0; i <= tokens.length - count; i += 1) {
      let free = true;
      for (let j = i; j < i + count; j += 1) {
        if (occupied[j]) {
          free = false;
          break;
        }
      }
      if (!free) continue;

      const exact = windowKey(tokens, i, count);
      let hit = exact != null && keySet.has(exact);
      if (!hit && count === 1 && exact) {
        const peeled = peelClitic(exact);
        hit = peeled != null && keySet.has(peeled);
      }
      if (!hit) continue;

      const start = tokens[i]!.start;
      const end = tokens[i + count - 1]!.end;
      matches.push({
        start,
        end,
        link: entry.link,
        surface: text.slice(start, end),
      });
      for (let j = i; j < i + count; j += 1) {
        occupied[j] = true;
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function selectionIsActive(): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

export function renderLinkedArabic(
  text: string,
  links: ArabicLink[],
  onPhraseActivate?: PhraseActivateHandler,
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
    const className =
      match.link.kind === "vocabulary"
        ? "linked-vocab"
        : match.link.kind === "structure"
          ? "linked-structure"
          : "linked-known";
    const activate = (target: EventTarget & Element) => {
      if (selectionIsActive()) return;
      onPhraseActivate?.(
        match.link,
        target.getBoundingClientRect(),
        match.surface,
      );
    };
    nodes.push(
      <span
        key={`${match.link.href}-${match.start}-${index}`}
        role="button"
        tabIndex={0}
        data-arabic-phrase=""
        className={className}
        onClick={(event) => {
          activate(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          activate(event.currentTarget);
        }}
      >
        {text.slice(match.start, match.end)}
      </span>,
    );
    cursor = match.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
