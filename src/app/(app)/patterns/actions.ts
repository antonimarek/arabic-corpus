"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  linkPatternVocabulary,
  unlinkPatternVocabulary,
  updatePatternRecord,
  writePattern,
} from "@/lib/corpus/write";
import { emptyToNull } from "@/lib/form";
import {
  parseMasteryState,
  parsePatternPairs,
  parsePatternRole,
} from "@/lib/patterns";
import { requireUserId } from "@/lib/require-user";

export type PatternFormState = {
  error?: string;
};

function formInput(formData: FormData, name: string) {
  return {
    name,
    arabic_sketch: emptyToNull(formData.get("arabic_sketch")),
    form_label: emptyToNull(formData.get("form_label")),
    meaning_shift: emptyToNull(formData.get("meaning_shift")),
    cue: emptyToNull(formData.get("cue")),
    notes: emptyToNull(formData.get("notes")),
    mastery_state: parseMasteryState(formData.get("mastery_state")),
  };
}

function revalidatePatternPaths(patternId?: string, vocabularyIds?: string[]) {
  revalidatePath("/patterns");
  revalidatePath("/");
  if (patternId) {
    revalidatePath(`/patterns/${patternId}`);
  }
  for (const vocabularyId of vocabularyIds ?? []) {
    revalidatePath(`/vocabulary/${vocabularyId}`);
  }
}

async function linkPairs(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  patternId: string,
  pairs: { baseId: string; derivedId: string }[],
): Promise<{ error?: string; vocabularyIds: string[] }> {
  const vocabularyIds = new Set<string>();
  for (const pair of pairs) {
    vocabularyIds.add(pair.baseId);
    vocabularyIds.add(pair.derivedId);
    const baseResult = await linkPatternVocabulary(
      supabase,
      patternId,
      pair.baseId,
      "base",
    );
    if (baseResult.error) {
      return { error: baseResult.error, vocabularyIds: [...vocabularyIds] };
    }
    const derivedResult = await linkPatternVocabulary(
      supabase,
      patternId,
      pair.derivedId,
      "derived",
    );
    if (derivedResult.error) {
      return { error: derivedResult.error, vocabularyIds: [...vocabularyIds] };
    }
  }
  return { vocabularyIds: [...vocabularyIds] };
}

export async function createPattern(
  _prev: PatternFormState,
  formData: FormData,
): Promise<PatternFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { pairs, error: pairError } = parsePatternPairs(formData);
  if (pairError) {
    return { error: pairError };
  }
  if (pairs.length === 0) {
    return {
      error: "Add at least one example pair of words you already know.",
    };
  }

  const { supabase, userId } = await requireUserId();
  const result = await writePattern(supabase, userId, formInput(formData, name));
  if ("error" in result) {
    return { error: result.error };
  }

  const linkResult = await linkPairs(supabase, result.id, pairs);
  if (linkResult.error) {
    return { error: linkResult.error };
  }

  const suggestionId = emptyToNull(formData.get("suggestion_id"));
  if (suggestionId) {
    await supabase
      .from("pattern_suggestions")
      .update({
        status: "confirmed",
        confirmed_pattern_id: result.id,
      })
      .eq("id", suggestionId)
      .eq("owner_id", userId);
    revalidatePath("/patterns/suggestions");
    revalidatePath(`/patterns/suggestions/${suggestionId}`);
  }

  revalidatePatternPaths(result.id, linkResult.vocabularyIds);
  redirect(`/patterns/${result.id}`);
}

export async function updatePattern(
  id: string,
  _prev: PatternFormState,
  formData: FormData,
): Promise<PatternFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { pairs, error: pairError } = parsePatternPairs(formData);
  if (pairError) {
    return { error: pairError };
  }

  const { supabase } = await requireUserId();
  const result = await updatePatternRecord(
    supabase,
    id,
    formInput(formData, name),
  );
  if ("error" in result) {
    return { error: result.error };
  }

  let vocabularyIds: string[] = [];
  if (pairs.length > 0) {
    const linkResult = await linkPairs(supabase, id, pairs);
    if (linkResult.error) {
      return { error: linkResult.error };
    }
    vocabularyIds = linkResult.vocabularyIds;
  }

  revalidatePatternPaths(id, vocabularyIds);
  redirect(`/patterns/${id}`);
}

export async function deletePattern(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("morph_patterns").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePatternPaths();
  redirect("/patterns");
}

export async function setPatternMastery(id: string, formData: FormData) {
  const mastery = parseMasteryState(formData.get("mastery_state"));
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("morph_patterns")
    .update({ mastery_state: mastery })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePatternPaths(id);
}

export async function linkVocabularyToPattern(
  patternId: string,
  formData: FormData,
): Promise<void> {
  const vocabularyId = String(formData.get("vocabulary_id") ?? "").trim();
  if (!vocabularyId) {
    throw new Error("Pick a word.");
  }
  const role = parsePatternRole(formData.get("role"), "related");
  const { supabase } = await requireUserId();
  const result = await linkPatternVocabulary(
    supabase,
    patternId,
    vocabularyId,
    role,
  );
  if (result.error) {
    throw new Error(result.error);
  }
  revalidatePatternPaths(patternId, [vocabularyId]);
}

export async function unlinkVocabularyFromPattern(
  patternId: string,
  vocabularyId: string,
) {
  const { supabase } = await requireUserId();
  const result = await unlinkPatternVocabulary(
    supabase,
    patternId,
    vocabularyId,
  );
  if (result.error) {
    throw new Error(result.error);
  }
  revalidatePatternPaths(patternId, [vocabularyId]);
}

export async function linkPatternFromVocabulary(
  vocabularyId: string,
  formData: FormData,
): Promise<void> {
  const patternId = String(formData.get("pattern_id") ?? "").trim();
  if (!patternId) {
    throw new Error("Pick a pattern.");
  }
  const role = parsePatternRole(formData.get("role"), "related");
  const { supabase } = await requireUserId();
  const result = await linkPatternVocabulary(
    supabase,
    patternId,
    vocabularyId,
    role,
  );
  if (result.error) {
    throw new Error(result.error);
  }
  revalidatePatternPaths(patternId, [vocabularyId]);
  redirect(`/vocabulary/${vocabularyId}`);
}
