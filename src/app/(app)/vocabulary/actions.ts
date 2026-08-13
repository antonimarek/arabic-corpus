"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyToNull, parseTagNames } from "@/lib/form";
import { phraseSearchKey } from "@/lib/lookup-phrase";
import { requireUserId } from "@/lib/require-user";
import { syncTags } from "@/lib/tags";

export type VocabularyFormState = {
  error?: string;
  existingId?: string;
};

function parseSenses(formData: FormData) {
  const glosses = formData.getAll("sense_gloss").map((v) => String(v).trim());
  const langs = formData.getAll("sense_lang").map((v) => String(v).trim());
  const senses: { gloss: string; lang: string }[] = [];
  for (let i = 0; i < glosses.length; i += 1) {
    const gloss = glosses[i];
    if (!gloss) continue;
    senses.push({ gloss, lang: langs[i] || "en" });
  }
  return senses;
}

export async function createVocabulary(
  _prev: VocabularyFormState,
  formData: FormData,
): Promise<VocabularyFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const senses = parseSenses(formData);
  if (senses.length === 0) {
    return { error: "Add at least one sense (gloss)." };
  }

  const { supabase, userId } = await requireUserId();
  const searchKey = phraseSearchKey(arabic);
  if (searchKey) {
    const { data: existing } = await supabase
      .from("vocabulary")
      .select("id")
      .eq("search_arabic", searchKey)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return {
        error:
          "This word is already in the corpus. Open the existing card to add a sense.",
        existingId: existing.id,
      };
    }
  }

  const { data, error } = await supabase
    .from("vocabulary")
    .insert({
      owner_id: userId,
      arabic,
      transliteration: emptyToNull(formData.get("transliteration")),
      part_of_speech: emptyToNull(formData.get("part_of_speech")),
      notes: emptyToNull(formData.get("notes")),
      root: emptyToNull(formData.get("root")),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save vocabulary." };
  }

  const { error: senseError } = await supabase.from("vocabulary_senses").insert(
    senses.map((sense) => ({
      vocabulary_id: data.id,
      owner_id: userId,
      gloss: sense.gloss,
      lang: sense.lang,
    })),
  );

  if (senseError) {
    return { error: senseError.message };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "vocabulary", entityId: data.id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/vocabulary");
  revalidatePath("/");
  redirect(`/vocabulary/${data.id}`);
}

export async function updateVocabulary(
  id: string,
  _prev: VocabularyFormState,
  formData: FormData,
): Promise<VocabularyFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const senses = parseSenses(formData);
  if (senses.length === 0) {
    return { error: "Add at least one sense (gloss)." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("vocabulary")
    .update({
      arabic,
      transliteration: emptyToNull(formData.get("transliteration")),
      part_of_speech: emptyToNull(formData.get("part_of_speech")),
      notes: emptyToNull(formData.get("notes")),
      root: emptyToNull(formData.get("root")),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const { error: deleteSensesError } = await supabase
    .from("vocabulary_senses")
    .delete()
    .eq("vocabulary_id", id);

  if (deleteSensesError) {
    return { error: deleteSensesError.message };
  }

  const { error: senseError } = await supabase.from("vocabulary_senses").insert(
    senses.map((sense) => ({
      vocabulary_id: id,
      owner_id: userId,
      gloss: sense.gloss,
      lang: sense.lang,
    })),
  );

  if (senseError) {
    return { error: senseError.message };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "vocabulary", entityId: id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${id}`);
  revalidatePath("/");
  redirect(`/vocabulary/${id}`);
}

export async function deleteVocabulary(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("vocabulary").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/vocabulary");
  revalidatePath("/");
  redirect("/vocabulary");
}
