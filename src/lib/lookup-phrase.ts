import type { SupabaseClient } from "@supabase/supabase-js";

import { firstGloss } from "@/lib/arabic-links";
import {
  suggestedFormHosts,
  type FormHost,
} from "@/lib/form-suggest";
import { normalizeArabic } from "@/lib/import/normalize";
import {
  matchKeysForNormalized,
  phraseMatchKey,
} from "@/lib/match-arabic";
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

type VocabRow = {
  id: string;
  arabic: string;
  vocabulary_senses: { gloss: string; created_at?: string }[] | null;
};

async function vocabHitsForKeys(
  supabase: SupabaseClient<Database>,
  keys: string[],
): Promise<VocabRow[]> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return [];

  const [{ data: vocabRows }, { data: formRows }] = await Promise.all([
    supabase
      .from("vocabulary")
      .select("id, arabic, vocabulary_senses(gloss, created_at)")
      .in("search_arabic", unique)
      .limit(10),
    supabase
      .from("vocabulary_forms")
      .select(
        "vocabulary_id, vocabulary(id, arabic, vocabulary_senses(gloss, created_at))",
      )
      .in("search_arabic", unique)
      .limit(10),
  ]);

  const byId = new Map<string, VocabRow>();
  for (const row of vocabRows ?? []) {
    byId.set(row.id, row);
  }
  for (const row of formRows ?? []) {
    const vocab = row.vocabulary;
    if (!vocab) continue;
    byId.set(vocab.id, vocab);
  }
  return [...byId.values()];
}

export async function lookupPhraseHits(
  supabase: SupabaseClient<Database>,
  phrase: string,
): Promise<PhraseHit[]> {
  const key = phraseMatchKey(phrase) ?? phraseSearchKey(phrase);
  if (!key) return [];
  const keys = matchKeysForNormalized(key);

  const [{ data: structureRows }, vocabRows] = await Promise.all([
    supabase
      .from("structures")
      .select("id, name, arabic_form, meaning")
      .eq("search_arabic", key)
      .limit(5),
    vocabHitsForKeys(supabase, keys),
  ]);

  const hits: PhraseHit[] = [];

  for (const row of vocabRows) {
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

export async function suggestFormHostsForPhrase(
  supabase: SupabaseClient<Database>,
  phrase: string,
): Promise<PhraseHit[]> {
  const { data } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, root, part_of_speech, vocabulary_senses(gloss, created_at)",
    )
    .order("created_at", { ascending: false });

  const hosts: FormHost[] = (data ?? []).map((row) => ({
    id: row.id,
    arabic: row.arabic,
    root: row.root,
    part_of_speech: row.part_of_speech,
    gloss: firstGloss(row.vocabulary_senses),
  }));

  return suggestedFormHosts(phrase, hosts).map((host) => ({
    type: "vocabulary" as const,
    id: host.id,
    arabic: host.arabic,
    href: `/vocabulary/${host.id}`,
    gloss: host.gloss,
  }));
}
