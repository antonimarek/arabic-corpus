"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  linkPatternVocabulary,
  writePattern,
} from "@/lib/corpus/write";
import { parseSuggestionPayload } from "@/lib/pattern-discover/payload";
import { requireUserId } from "@/lib/require-user";

function revalidateSuggestion(id: string, patternId?: string) {
  revalidatePath("/patterns");
  revalidatePath("/patterns/suggestions");
  revalidatePath(`/patterns/suggestions/${id}`);
  if (patternId) {
    revalidatePath(`/patterns/${patternId}`);
  }
}

export async function dismissPatternSuggestion(id: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("pattern_suggestions")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidateSuggestion(id);
  redirect("/patterns/suggestions");
}

export async function confirmPatternSuggestion(id: string) {
  const { supabase, userId } = await requireUserId();
  const { data: suggestion, error } = await supabase
    .from("pattern_suggestions")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!suggestion) {
    throw new Error("Suggestion not found.");
  }
  if (suggestion.status !== "pending") {
    throw new Error("Suggestion is not pending.");
  }

  const payload = parseSuggestionPayload(suggestion.payload);
  if (payload.pairs.length === 0) {
    throw new Error("Suggestion has no example pairs.");
  }

  const created = await writePattern(supabase, userId, {
    name: suggestion.name,
    arabic_sketch: suggestion.arabic_sketch,
    form_label: suggestion.form_label,
    meaning_shift: suggestion.meaning_shift,
    cue: suggestion.cue,
    notes: null,
    mastery_state: "encountered",
  });
  if ("error" in created) {
    throw new Error(created.error);
  }

  for (const pair of payload.pairs) {
    const baseResult = await linkPatternVocabulary(
      supabase,
      created.id,
      pair.base_id,
      "base",
    );
    if (baseResult.error) {
      throw new Error(baseResult.error);
    }
    const derivedResult = await linkPatternVocabulary(
      supabase,
      created.id,
      pair.derived_id,
      "derived",
    );
    if (derivedResult.error) {
      throw new Error(derivedResult.error);
    }
  }

  const { error: updateError } = await supabase
    .from("pattern_suggestions")
    .update({
      status: "confirmed",
      confirmed_pattern_id: created.id,
    })
    .eq("id", id)
    .eq("owner_id", userId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateSuggestion(id, created.id);
  for (const pair of payload.pairs) {
    revalidatePath(`/vocabulary/${pair.base_id}`);
    revalidatePath(`/vocabulary/${pair.derived_id}`);
  }
  redirect(`/patterns/${created.id}`);
}
