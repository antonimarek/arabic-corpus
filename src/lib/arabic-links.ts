import type { ArabicLink } from "@/lib/highlight-arabic";

export type SenseGloss = {
  gloss: string;
  created_at?: string;
};

export function firstGloss(
  senses: SenseGloss[] | null | undefined,
): string | undefined {
  if (!senses?.length) return undefined;
  const sorted = [...senses].sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
  const gloss = sorted[0]?.gloss.trim();
  return gloss || undefined;
}

export function vocabularyLink(vocab: {
  id: string;
  arabic: string;
  vocabulary_senses?: SenseGloss[] | null;
}): ArabicLink {
  return {
    phrase: vocab.arabic,
    href: `/vocabulary/${vocab.id}`,
    kind: "vocabulary",
    gloss: firstGloss(vocab.vocabulary_senses),
  };
}

export function structureLink(structure: {
  id: string;
  name: string;
  arabic_form: string | null;
  meaning?: string | null;
}): ArabicLink | null {
  if (!structure.arabic_form) return null;
  const meaning = structure.meaning?.trim();
  return {
    phrase: structure.arabic_form,
    href: `/structures/${structure.id}`,
    kind: "structure",
    gloss: meaning || structure.name,
  };
}
