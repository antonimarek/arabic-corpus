"use server";

import { requireUserId } from "@/lib/require-user";
import {
  searchVocabularyOptions,
  type VocabSearchOption,
} from "@/lib/vocab-search";

export async function searchVocabulary(
  query: string,
  limit = 20,
): Promise<{ options: VocabSearchOption[]; error?: string }> {
  try {
    const { supabase } = await requireUserId();
    const options = await searchVocabularyOptions(supabase, query, limit);
    return { options };
  } catch (error) {
    return {
      options: [],
      error: error instanceof Error ? error.message : "Search failed.",
    };
  }
}
