import { firstGloss } from "@/lib/arabic-links";
import type { CorpusClient } from "@/lib/corpus/write";
import {
  lookupKeysForSurface,
  tokenizeArabic,
} from "@/lib/match-arabic";
import { normalizeArabic } from "@/lib/import/normalize";

export type VocabSearchOption = {
  id: string;
  arabic: string;
  gloss?: string;
  hint?: string;
};

const IN_CHUNK = 80;

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

type VocabSenseRow = {
  id: string;
  arabic: string;
  transliteration?: string | null;
  vocabulary_senses?: { gloss: string; created_at?: string }[] | null;
  vocabulary_forms?: { arabic: string }[] | null;
};

function toOption(row: VocabSenseRow): VocabSearchOption {
  const gloss = firstGloss(row.vocabulary_senses);
  const hint = [row.transliteration, gloss].filter(Boolean).join(" · ") || undefined;
  return {
    id: row.id,
    arabic: row.arabic,
    gloss,
    hint,
  };
}

/** Typeahead search over vocabulary arabic + gloss. */
export async function searchVocabularyOptions(
  supabase: CorpusClient,
  query: string,
  limit = 20,
): Promise<VocabSearchOption[]> {
  const needle = query.trim();
  if (!needle) {
    const { data, error } = await supabase
      .from("vocabulary")
      .select(
        "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toOption);
  }

  const pattern = `%${needle}%`;
  const normalized = normalizeArabic(needle);

  const [{ data: arabicRows, error: arabicError }, { data: glossHits, error: glossError }] =
    await Promise.all([
      supabase
        .from("vocabulary")
        .select(
          "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
        )
        .ilike("arabic", pattern)
        .order("arabic")
        .limit(limit),
      supabase
        .from("vocabulary_senses")
        .select(
          "vocabulary_id, gloss, vocabulary(id, arabic, transliteration, vocabulary_senses(gloss, created_at))",
        )
        .ilike("gloss", pattern)
        .limit(limit),
    ]);
  if (arabicError) throw new Error(arabicError.message);
  if (glossError) throw new Error(glossError.message);

  const byId = new Map((arabicRows ?? []).map((row) => [row.id, toOption(row)]));

  if (normalized && byId.size < limit) {
    const { data: normRows, error: normError } = await supabase
      .from("vocabulary")
      .select(
        "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
      )
      .ilike("search_arabic", `%${normalized}%`)
      .order("arabic")
      .limit(limit);
    if (normError) throw new Error(normError.message);
    for (const row of normRows ?? []) {
      if (byId.has(row.id)) continue;
      byId.set(row.id, toOption(row));
      if (byId.size >= limit) break;
    }
  }

  for (const hit of glossHits ?? []) {
    const vocab = hit.vocabulary;
    if (!vocab || byId.has(vocab.id)) continue;
    byId.set(vocab.id, toOption(vocab));
    if (byId.size >= limit) break;
  }
  return [...byId.values()].slice(0, limit);
}

/** Vocab rows whose arabic/forms can match tokens in the given Arabic text. */
export async function vocabularyMatchingText(
  supabase: CorpusClient,
  arabic: string,
): Promise<VocabSenseRow[]> {
  const keys = new Set<string>();
  for (const token of tokenizeArabic(arabic)) {
    for (const key of lookupKeysForSurface(token.surface)) {
      keys.add(key);
    }
  }
  const unique = [...keys];
  if (unique.length === 0) return [];

  const byId = new Map<string, VocabSenseRow>();
  const chunks = chunkValues(unique, IN_CHUNK);

  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      Promise.all([
        supabase
          .from("vocabulary")
          .select(
            "id, arabic, vocabulary_senses(gloss, created_at), vocabulary_forms(arabic)",
          )
          .in("search_arabic", chunk),
        supabase
          .from("vocabulary_forms")
          .select(
            "vocabulary_id, vocabulary(id, arabic, vocabulary_senses(gloss, created_at), vocabulary_forms(arabic))",
          )
          .in("search_arabic", chunk),
      ]),
    ),
  );

  for (const [vocabResult, formResult] of chunkResults) {
    if (vocabResult.error) throw new Error(vocabResult.error.message);
    if (formResult.error) throw new Error(formResult.error.message);
    for (const row of vocabResult.data ?? []) {
      byId.set(row.id, row);
    }
    for (const row of formResult.data ?? []) {
      const vocab = row.vocabulary;
      if (!vocab) continue;
      byId.set(vocab.id, vocab);
    }
  }

  return [...byId.values()];
}
