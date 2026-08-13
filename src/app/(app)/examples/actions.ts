"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateExampleRecord, writeExample } from "@/lib/corpus/write";
import { emptyToNull, parseIdList, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";

export type ExampleFormState = {
  error?: string;
};

function parseSourceLine(formData: FormData): number | null {
  const raw = String(formData.get("source_line") ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return null;
  }
  return n;
}

function formInput(formData: FormData, arabic: string) {
  return {
    arabic,
    translation: emptyToNull(formData.get("translation")),
    transliteration: emptyToNull(formData.get("transliteration")),
    notes: emptyToNull(formData.get("notes")),
    textId: emptyToNull(formData.get("text_id")),
    sourceLine: parseSourceLine(formData),
    vocabularyIds: parseIdList(formData, "vocabulary_ids"),
    structureIds: parseIdList(formData, "structure_ids"),
    tags: parseTagNames(formData.get("tags")),
  };
}

function revalidateExample(textId: string | null) {
  revalidatePath("/");
  revalidatePath("/examples");
  revalidatePath("/vocabulary");
  revalidatePath("/structures");
  if (textId) {
    revalidatePath(`/texts/${textId}`);
    revalidatePath("/texts");
  }
}

export async function createExample(
  _prev: ExampleFormState,
  formData: FormData,
): Promise<ExampleFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const input = formInput(formData, arabic);
  if (input.sourceLine != null && !input.textId) {
    return { error: "Source line requires a source text." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await writeExample(supabase, userId, input);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidateExample(input.textId);
  redirect(`/examples/${result.id}`);
}

export async function updateExample(
  id: string,
  _prev: ExampleFormState,
  formData: FormData,
): Promise<ExampleFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const input = formInput(formData, arabic);
  if (input.sourceLine != null && !input.textId) {
    return { error: "Source line requires a source text." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await updateExampleRecord(supabase, userId, id, input);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath(`/examples/${id}`);
  revalidateExample(input.textId);
  redirect(`/examples/${id}`);
}

export async function deleteExample(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("examples").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  revalidatePath("/examples");
  revalidatePath("/vocabulary");
  revalidatePath("/structures");
  redirect("/examples");
}
