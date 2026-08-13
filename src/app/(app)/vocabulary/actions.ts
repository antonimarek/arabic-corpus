"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  updateVocabularyRecord,
  writeVocabulary,
} from "@/lib/corpus/write";
import { emptyToNull, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";

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

function formInput(formData: FormData, arabic: string) {
  return {
    arabic,
    transliteration: emptyToNull(formData.get("transliteration")),
    part_of_speech: emptyToNull(formData.get("part_of_speech")),
    notes: emptyToNull(formData.get("notes")),
    root: emptyToNull(formData.get("root")),
    senses: parseSenses(formData),
    tags: parseTagNames(formData.get("tags")),
  };
}

export async function createVocabulary(
  _prev: VocabularyFormState,
  formData: FormData,
): Promise<VocabularyFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const input = formInput(formData, arabic);
  if (input.senses.length === 0) {
    return { error: "Add at least one sense (gloss)." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await writeVocabulary(supabase, userId, input);
  if ("error" in result) {
    return { error: result.error, existingId: result.existingId };
  }

  revalidatePath("/vocabulary");
  revalidatePath("/");
  redirect(`/vocabulary/${result.id}`);
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

  const input = formInput(formData, arabic);
  if (input.senses.length === 0) {
    return { error: "Add at least one sense (gloss)." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await updateVocabularyRecord(supabase, userId, id, input);
  if ("error" in result) {
    return { error: result.error };
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
