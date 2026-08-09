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
): number {
  if (!value) return 0;
  const q = query.toLowerCase();
  const v = value.toLowerCase();
  if (v === q) return weight + 100;
  if (v.startsWith(q)) return weight + 40;
  if (v.includes(q)) return weight;
  return 0;
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
      .select("id, title, arabic, translation")
      .or(
        `title.ilike.${pattern},arabic.ilike.${pattern},translation.ilike.${pattern}`,
      )
      .limit(40),
    supabase
      .from("examples")
      .select("id, arabic, translation, transliteration")
      .or(
        `arabic.ilike.${pattern},translation.ilike.${pattern},transliteration.ilike.${pattern}`,
      )
      .limit(40),
    supabase
      .from("vocabulary")
      .select("id, arabic, transliteration, part_of_speech")
      .or(`arabic.ilike.${pattern},transliteration.ilike.${pattern}`)
      .limit(40),
    supabase
      .from("vocabulary_senses")
      .select(
        "vocabulary_id, gloss, lang, vocabulary(id, arabic, transliteration)",
      )
      .ilike("gloss", glossPattern)
      .limit(40),
    supabase
      .from("structures")
      .select("id, name, arabic_form, transliteration, meaning")
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
    const score = Math.max(
      scoreField(query, row.title, 80),
      scoreField(query, row.arabic, 50),
      scoreField(query, row.translation, 40),
    );
    if (score <= 0) continue;
    upsert({
      type: "text",
      id: row.id,
      title: row.title,
      arabic: row.arabic,
      subtitle: row.translation ?? undefined,
      score,
    });
  }

  for (const row of examples ?? []) {
    const score = Math.max(
      scoreField(query, row.arabic, 70),
      scoreField(query, row.transliteration, 65),
      scoreField(query, row.translation, 45),
    );
    if (score <= 0) continue;
    upsert({
      type: "example",
      id: row.id,
      title: row.arabic,
      arabic: row.arabic,
      subtitle: row.translation ?? row.transliteration ?? undefined,
      score,
    });
  }

  for (const row of vocabulary ?? []) {
    const score = Math.max(
      scoreField(query, row.arabic, 90),
      scoreField(query, row.transliteration, 75),
    );
    if (score <= 0) continue;
    upsert({
      type: "vocabulary",
      id: row.id,
      title: row.arabic,
      arabic: row.arabic,
      subtitle: [row.transliteration, row.part_of_speech]
        .filter(Boolean)
        .join(" · "),
      score,
    });
  }

  for (const row of senses ?? []) {
    const vocab = row.vocabulary as {
      id: string;
      arabic: string;
      transliteration: string | null;
    } | null;
    if (!vocab) continue;
    const score = scoreField(query, row.gloss, 70);
    if (score <= 0) continue;
    upsert({
      type: "vocabulary",
      id: vocab.id,
      title: vocab.arabic,
      arabic: vocab.arabic,
      subtitle: `${row.gloss} (${row.lang})`,
      score,
    });
  }

  for (const row of structures ?? []) {
    const score = Math.max(
      scoreField(query, row.name, 95),
      scoreField(query, row.arabic_form, 85),
      scoreField(query, row.transliteration, 70),
      scoreField(query, row.meaning, 60),
    );
    if (score <= 0) continue;
    upsert({
      type: "structure",
      id: row.id,
      title: row.name,
      arabic: row.arabic_form ?? undefined,
      subtitle: row.meaning ?? row.transliteration ?? undefined,
      score,
    });
  }

  return [...hits.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
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
