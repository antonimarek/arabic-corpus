"use server";

import {
  lookupPhraseHits,
  suggestFormHostsForPhrase,
  type PhraseHit,
} from "@/lib/lookup-phrase";
import { requireUserId } from "@/lib/require-user";

export type { PhraseHit };

export async function lookupPhrase(phrase: string): Promise<{
  hits: PhraseHit[];
  suggestions: PhraseHit[];
  error?: string;
}> {
  const trimmed = phrase.trim();
  if (!trimmed) return { hits: [], suggestions: [] };

  const { supabase } = await requireUserId();
  try {
    const hits = await lookupPhraseHits(supabase, trimmed);
    const suggestions =
      hits.length === 0
        ? await suggestFormHostsForPhrase(supabase, trimmed)
        : [];
    return { hits, suggestions };
  } catch (error) {
    return {
      hits: [],
      suggestions: [],
      error: error instanceof Error ? error.message : "Lookup failed.",
    };
  }
}
