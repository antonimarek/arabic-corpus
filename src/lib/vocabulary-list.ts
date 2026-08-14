import type { PosKind } from "@/lib/citation";
import { relativeAge } from "@/lib/relative-age";

export type VocabularyListRow = {
  id: string;
  href: string;
  tags: string[];
  arabic: string;
  arabicPair?: string | null;
  transliteration?: string | null;
  partOfSpeech?: string | null;
  gloss?: string | null;
  kind: PosKind;
  createdAt: string;
};

export type VocabSort = "newest" | "oldest";

const POS_ORDER: PosKind[] = ["verb", "noun", "other"];

export function parsePosKindParam(value: string | null): PosKind | null {
  if (value === "verb" || value === "noun" || value === "other") return value;
  return null;
}

export function parseSortParam(value: string | null): VocabSort {
  return value === "oldest" ? "oldest" : "newest";
}

export function presentPosKinds(rows: { kind: PosKind }[]): PosKind[] {
  const present = new Set(rows.map((row) => row.kind));
  return POS_ORDER.filter((kind) => present.has(kind));
}

export function filterVocabularyRows(
  rows: VocabularyListRow[],
  kind: PosKind | null,
  tag: string | null,
): VocabularyListRow[] {
  return rows.filter((row) => {
    if (kind && row.kind !== kind) return false;
    if (tag && !row.tags.includes(tag)) return false;
    return true;
  });
}

export function sortVocabularyRows(
  rows: VocabularyListRow[],
  sort: VocabSort,
): VocabularyListRow[] {
  return [...rows].sort((left, right) => {
    const cmp = left.createdAt.localeCompare(right.createdAt);
    return sort === "oldest" ? cmp : -cmp;
  });
}

export function vocabularyRowSubtitle(
  row: Pick<
    VocabularyListRow,
    "transliteration" | "partOfSpeech" | "gloss" | "createdAt"
  >,
  hidePos: boolean,
  now: Date = new Date(),
): string {
  return [
    row.transliteration,
    hidePos ? null : row.partOfSpeech,
    row.gloss,
    relativeAge(row.createdAt, now),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function vocabularyEmptyMessage(
  kind: PosKind | null,
  tag: string | null,
): string {
  const label =
    kind === "verb" ? "verbs" : kind === "noun" ? "nouns" : "other words";
  if (kind && tag) return `No ${label} with this tag.`;
  if (kind) return `No ${label}.`;
  if (tag) return "No rows with this tag.";
  return "No vocabulary yet.";
}
