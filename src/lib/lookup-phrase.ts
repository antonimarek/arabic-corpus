import type { SupabaseClient } from "@supabase/supabase-js";

import { firstGloss } from "@/lib/arabic-links";
import { normalizeArabic } from "@/lib/import/normalize";
import type { Database } from "@/types/database";

export type PhraseHit = {
  type: "vocabulary" | "structure";
  id: string;
  arabic: string;
  href: string;
  gloss?: string;
};

export function phraseSearchKey(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const key = normalizeArabic(trimmed);
  if (!key) return null;
  return key;
}

export function hitsShareSearchKey(
  query: string,
  storedArabic: string,
): boolean {
  const queryKey = phraseSearchKey(query);
  const storedKey = phraseSearchKey(storedArabic);
  return queryKey != null && queryKey === storedKey;
}

export async function lookupPhraseHits(
  supabase: SupabaseClient<Database>,
  phrase: string,
): Promise<PhraseHit[]> {
  const key = phraseSearchKey(phrase);
  if (!key) return [];

  const [{ data: vocabRows }, { data: structureRows }] = await Promise.all([
    supabase
      .from("vocabulary")
      .select("id, arabic, vocabulary_senses(gloss, created_at)")
      .eq("search_arabic", key)
      .limit(5),
    supabase
      .from("structures")
      .select("id, name, arabic_form, meaning")
      .eq("search_arabic", key)
      .limit(5),
  ]);

  const hits: PhraseHit[] = [];

  for (const row of vocabRows ?? []) {
    hits.push({
      type: "vocabulary",
      id: row.id,
      arabic: row.arabic,
      href: `/vocabulary/${row.id}`,
      gloss: firstGloss(row.vocabulary_senses),
    });
  }

  for (const row of structureRows ?? []) {
    if (!row.arabic_form) continue;
    hits.push({
      type: "structure",
      id: row.id,
      arabic: row.arabic_form,
      href: `/structures/${row.id}`,
      gloss: row.meaning?.trim() || row.name,
    });
  }

  return hits;
}
