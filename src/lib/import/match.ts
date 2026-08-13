import { phraseSearchKey } from "@/lib/lookup-phrase";
import type { CorpusClient } from "@/lib/corpus/write";

import { matchArabic, type ImportItem } from "./bundle";

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
): Promise<(string | null)[]> {
  const existing = items.map(() => null as string | null);

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
        existing[index] = row.id;
      }
    }
  }

  return existing;
}

async function fillBySearchArabic(
  supabase: CorpusClient,
  table: "vocabulary" | "examples" | "texts" | "structures",
  keys: Map<string, number[]>,
  existing: (string | null)[],
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
      existing[index] = row.id;
    }
  }
}
