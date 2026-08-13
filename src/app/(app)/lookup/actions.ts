"use server";

import {
  lookupPhraseHits,
  type PhraseHit,
} from "@/lib/lookup-phrase";
import { requireUserId } from "@/lib/require-user";

export type { PhraseHit };

export async function lookupPhrase(phrase: string): Promise<{
  hits: PhraseHit[];
  error?: string;
}> {
  const trimmed = phrase.trim();
  if (!trimmed) return { hits: [] };

  const { supabase } = await requireUserId();
  try {
    const hits = await lookupPhraseHits(supabase, trimmed);
    return { hits };
  } catch (error) {
    return {
      hits: [],
      error: error instanceof Error ? error.message : "Lookup failed.",
    };
  }
}
