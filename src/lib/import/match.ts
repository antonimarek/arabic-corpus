import { citationArabic } from "@/lib/citation";
import type { CorpusClient } from "@/lib/corpus/write";
import type { ExistingVocabularyState } from "@/lib/import/enrich";
import { phraseSearchKey } from "@/lib/lookup-phrase";
import { notNull } from "@/lib/tags";

import { matchArabic, type ImportItem } from "./bundle";

export type ExistingMatch = {
  id: string;
  vocabulary?: ExistingVocabularyState;
};

function addKey(map: Map<string, number[]>, key: string, index: number) {
  const list = map.get(key);
  if (list) {
    list.push(index);
  } else {
    map.set(key, [index]);
  }
}

export async function findExistingMatches(
  supabase: CorpusClient,
  items: ImportItem[],
): Promise<(ExistingMatch | null)[]> {
  const existing = items.map(() => null as ExistingMatch | null);

  const vocabKeys = new Map<string, number[]>();
  const exampleKeys = new Map<string, number[]>();
  const textKeys = new Map<string, number[]>();
  const structureArabicKeys = new Map<string, number[]>();
  const structureNames = new Map<string, number[]>();

  items.forEach((item, index) => {
    if (item.type === "vocabulary") {
      const key = phraseSearchKey(item.arabic ?? "");
      if (key) addKey(vocabKeys, key, index);
      return;
    }
    if (item.type === "example") {
      const key = phraseSearchKey(item.arabic ?? "");
      if (key) addKey(exampleKeys, key, index);
      return;
    }
    if (item.type === "text") {
      const key = phraseSearchKey(item.arabic ?? "");
      if (key) addKey(textKeys, key, index);
      return;
    }
    if (item.type === "structure") {
      const arabic = matchArabic(item);
      const key = arabic ? phraseSearchKey(arabic) : null;
      if (key) {
        addKey(structureArabicKeys, key, index);
        return;
      }
      const name = item.name?.trim();
      if (name) addKey(structureNames, name, index);
    }
  });

  await fillBySearchArabic(supabase, "vocabulary", vocabKeys, existing);
  await fillBySearchArabic(supabase, "examples", exampleKeys, existing);
  await fillBySearchArabic(supabase, "texts", textKeys, existing);
  await fillBySearchArabic(
    supabase,
    "structures",
    structureArabicKeys,
    existing,
  );

  if (structureNames.size > 0) {
    const { data } = await supabase
      .from("structures")
      .select("id, name")
      .in("name", [...structureNames.keys()]);
    for (const row of data ?? []) {
      for (const index of structureNames.get(row.name) ?? []) {
        existing[index] = { id: row.id };
      }
    }
  }

  const vocabMatchIds = [
    ...new Set(
      [...vocabKeys.values()]
        .flat()
        .map((index) => existing[index]?.id)
        .filter(notNull),
    ),
  ];
  if (vocabMatchIds.length > 0) {
    await attachVocabularySnapshots(supabase, existing, vocabMatchIds);
  }

  return existing;
}

async function fillBySearchArabic(
  supabase: CorpusClient,
  table: "vocabulary" | "examples" | "texts" | "structures",
  keys: Map<string, number[]>,
  existing: (ExistingMatch | null)[],
) {
  if (keys.size === 0) return;
  const { data } = await supabase
    .from(table)
    .select("id, search_arabic")
    .in("search_arabic", [...keys.keys()]);
  for (const row of data ?? []) {
    const key = row.search_arabic;
    if (!key) continue;
    for (const index of keys.get(key) ?? []) {
      existing[index] = { id: row.id };
    }
  }
}

async function attachVocabularySnapshots(
  supabase: CorpusClient,
  existing: (ExistingMatch | null)[],
  ids: string[],
) {
  const { data } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, transliteration, part_of_speech, notes, root, vocabulary_senses(gloss, lang), vocabulary_forms(arabic, slot), vocabulary_tags(tags(name))",
    )
    .in("id", ids);

  const byId = new Map(
    (data ?? []).map((row) => {
      const forms = row.vocabulary_forms ?? [];
      const snapshot: ExistingVocabularyState = {
        id: row.id,
        arabic: row.arabic,
        transliteration: row.transliteration,
        part_of_speech: row.part_of_speech,
        notes: row.notes,
        root: row.root,
        present: citationArabic(forms, "present_3ms"),
        plural: citationArabic(forms, "plural"),
        glosses: (row.vocabulary_senses ?? []).map((sense) => ({
          gloss: sense.gloss,
          lang: sense.lang || "en",
        })),
        tags: (row.vocabulary_tags ?? [])
          .map((link) => link.tags?.name)
          .filter(notNull),
      };
      return [row.id, snapshot] as const;
    }),
  );

  for (const match of existing) {
    if (!match) continue;
    const snapshot = byId.get(match.id);
    if (snapshot) {
      match.vocabulary = snapshot;
    }
  }
}
