import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type SearchHitType = "text" | "example" | "vocabulary" | "structure";

export type SearchHit = {
  type: SearchHitType;
  id: string;
  title: string;
  subtitle?: string;
  arabic?: string;
  score: number;
  matchLabel?: string;
  context?: string[];
};

function escapeIlike(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&").replace(/"/g, '\\"');
}

function ilikePattern(query: string): string {
  return `"%${escapeIlike(query)}%"`;
}

function scoreField(
  query: string,
  value: string | null | undefined,
  weight: number,
): { score: number; matched: boolean } {
  if (!value) return { score: 0, matched: false };
  const q = query.toLowerCase();
  const v = value.toLowerCase();
  if (v === q) return { score: weight + 100, matched: true };
  if (v.startsWith(q)) return { score: weight + 40, matched: true };
  if (v.includes(q)) return { score: weight, matched: true };
  return { score: 0, matched: false };
}

function bestMatch(
  query: string,
  fields: { value: string | null | undefined; weight: number; label: string }[],
): { score: number; matchLabel?: string } {
  let best = { score: 0, matchLabel: undefined as string | undefined };
  for (const field of fields) {
    const result = scoreField(query, field.value, field.weight);
    if (result.score > best.score) {
      best = { score: result.score, matchLabel: field.label };
    }
  }
  return best;
}

function snippetAround(
  text: string | null | undefined,
  query: string,
  radius = 42,
): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) {
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + q.length + radius);
  const slice = text.slice(start, end);
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

export async function searchCorpus(
  supabase: SupabaseClient<Database>,
  rawQuery: string,
): Promise<SearchHit[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const pattern = ilikePattern(query);
  const glossPattern = `%${escapeIlike(query)}%`;

  const [
    { data: texts },
    { data: examples },
    { data: vocabulary },
    { data: senses },
    { data: structures },
  ] = await Promise.all([
    supabase
      .from("texts")
      .select("id, title, arabic, translation, source")
      .or(
        `title.ilike.${pattern},arabic.ilike.${pattern},translation.ilike.${pattern}`,
      )
      .limit(40),
    supabase
      .from("examples")
      .select(
        "id, arabic, translation, transliteration, text_id, texts(title), example_structures(structures(name)), example_vocabulary(vocabulary(arabic))",
      )
      .or(
        `arabic.ilike.${pattern},translation.ilike.${pattern},transliteration.ilike.${pattern}`,
      )
      .limit(40),
    supabase
      .from("vocabulary")
      .select(
        "id, arabic, transliteration, part_of_speech, vocabulary_senses(gloss, lang)",
      )
      .or(`arabic.ilike.${pattern},transliteration.ilike.${pattern}`)
      .limit(40),
    supabase
      .from("vocabulary_senses")
      .select(
        "vocabulary_id, gloss, lang, vocabulary(id, arabic, transliteration, part_of_speech, vocabulary_senses(gloss, lang))",
      )
      .ilike("gloss", glossPattern)
      .limit(40),
    supabase
      .from("structures")
      .select(
        "id, name, arabic_form, transliteration, meaning, example_structures(example_id)",
      )
      .or(
        `name.ilike.${pattern},arabic_form.ilike.${pattern},transliteration.ilike.${pattern},meaning.ilike.${pattern}`,
      )
      .limit(40),
  ]);

  const hits = new Map<string, SearchHit>();

  function upsert(hit: SearchHit) {
    const key = `${hit.type}:${hit.id}`;
    const existing = hits.get(key);
    if (!existing || hit.score > existing.score) {
      hits.set(key, hit);
    }
  }

  for (const row of texts ?? []) {
    const { score, matchLabel } = bestMatch(query, [
      { value: row.title, weight: 80, label: "title" },
      { value: row.arabic, weight: 50, label: "arabic" },
      { value: row.translation, weight: 40, label: "translation" },
    ]);
    if (score <= 0) continue;
    upsert({
      type: "text",
      id: row.id,
      title: row.title,
      arabic:
        matchLabel === "arabic"
          ? snippetAround(row.arabic, query)
          : row.arabic.slice(0, 160) + (row.arabic.length > 160 ? "…" : ""),
      subtitle:
        matchLabel === "translation"
          ? snippetAround(row.translation, query)
          : (row.translation ?? undefined),
      score,
      matchLabel,
      context: [row.source].filter(Boolean) as string[],
    });
  }

  for (const row of examples ?? []) {
    const { score, matchLabel } = bestMatch(query, [
      { value: row.arabic, weight: 70, label: "arabic" },
      { value: row.transliteration, weight: 65, label: "transliteration" },
      { value: row.translation, weight: 45, label: "translation" },
    ]);
    if (score <= 0) continue;
    const structureNames =
      row.example_structures
        ?.map((item) => item.structures?.name)
        .filter(Boolean) ?? [];
    const vocabHints =
      row.example_vocabulary
        ?.map((item) => item.vocabulary?.arabic)
        .filter(Boolean)
        .slice(0, 3) ?? [];
    const sourceTitle = row.texts?.title;
    upsert({
      type: "example",
      id: row.id,
      title: row.arabic,
      arabic: row.arabic,
      subtitle: row.translation ?? row.transliteration ?? undefined,
      score,
      matchLabel,
      context: [
        sourceTitle ? `from ${sourceTitle}` : null,
        structureNames.length > 0 ? structureNames.join(", ") : null,
        vocabHints.length > 0 ? vocabHints.join(" · ") : null,
      ].filter(Boolean) as string[],
    });
  }

  for (const row of vocabulary ?? []) {
    const { score, matchLabel } = bestMatch(query, [
      { value: row.arabic, weight: 90, label: "arabic" },
      { value: row.transliteration, weight: 75, label: "transliteration" },
    ]);
    if (score <= 0) continue;
    const glosses =
      row.vocabulary_senses?.map((sense) => `${sense.gloss} (${sense.lang})`) ??
      [];
    upsert({
      type: "vocabulary",
      id: row.id,
      title: row.arabic,
      arabic: row.arabic,
      subtitle: glosses[0] ?? row.transliteration ?? undefined,
      score,
      matchLabel,
      context: [
        row.part_of_speech,
        glosses.length > 1 ? `${glosses.length} senses` : null,
      ].filter(Boolean) as string[],
    });
  }

  for (const row of senses ?? []) {
    const vocab = row.vocabulary;
    if (!vocab) continue;
    const score = scoreField(query, row.gloss, 70).score;
    if (score <= 0) continue;
    const glosses =
      vocab.vocabulary_senses?.map(
        (sense) => `${sense.gloss} (${sense.lang})`,
      ) ?? [];
    upsert({
      type: "vocabulary",
      id: vocab.id,
      title: vocab.arabic,
      arabic: vocab.arabic,
      subtitle: `${row.gloss} (${row.lang})`,
      score,
      matchLabel: "gloss",
      context: [
        vocab.part_of_speech,
        vocab.transliteration,
        glosses.length > 1 ? `${glosses.length} senses` : null,
      ].filter(Boolean) as string[],
    });
  }

  for (const row of structures ?? []) {
    const { score, matchLabel } = bestMatch(query, [
      { value: row.name, weight: 95, label: "name" },
      { value: row.arabic_form, weight: 85, label: "arabic" },
      { value: row.transliteration, weight: 70, label: "transliteration" },
      { value: row.meaning, weight: 60, label: "meaning" },
    ]);
    if (score <= 0) continue;
    const count = row.example_structures?.length ?? 0;
    upsert({
      type: "structure",
      id: row.id,
      title: row.name,
      arabic: row.arabic_form ?? undefined,
      subtitle: row.meaning ?? row.transliteration ?? undefined,
      score,
      matchLabel,
      context: [
        `${count} example${count === 1 ? "" : "s"}`,
        row.transliteration && matchLabel !== "transliteration"
          ? row.transliteration
          : null,
      ].filter(Boolean) as string[],
    });
  }

  return [...hits.values()].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  );
}

export function hrefForHit(hit: SearchHit): string {
  switch (hit.type) {
    case "text":
      return `/texts/${hit.id}`;
    case "example":
      return `/examples/${hit.id}`;
    case "vocabulary":
      return `/vocabulary/${hit.id}`;
    case "structure":
      return `/structures/${hit.id}`;
  }
}
