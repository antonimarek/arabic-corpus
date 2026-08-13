"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateStructureRecord, writeStructure } from "@/lib/corpus/write";
import { emptyToNull, parseIdList, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";

export type StructureFormState = {
  error?: string;
};

function formInput(formData: FormData, name: string) {
  return {
    name,
    arabic_form: emptyToNull(formData.get("arabic_form")),
    transliteration: emptyToNull(formData.get("transliteration")),
    meaning: emptyToNull(formData.get("meaning")),
    explanation: emptyToNull(formData.get("explanation")),
    notes: emptyToNull(formData.get("notes")),
    exampleIds: parseIdList(formData, "example_ids"),
    tags: parseTagNames(formData.get("tags")),
  };
}

export async function createStructure(
  _prev: StructureFormState,
  formData: FormData,
): Promise<StructureFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await writeStructure(supabase, userId, formInput(formData, name));
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/structures");
  revalidatePath("/");
  redirect(`/structures/${result.id}`);
}

export async function updateStructure(
  id: string,
  _prev: StructureFormState,
  formData: FormData,
): Promise<StructureFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { supabase, userId } = await requireUserId();
  const result = await updateStructureRecord(
    supabase,
    userId,
    id,
    formInput(formData, name),
  );
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/structures");
  revalidatePath(`/structures/${id}`);
  revalidatePath("/");
  redirect(`/structures/${id}`);
}

export async function deleteStructure(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("structures").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/structures");
  revalidatePath("/");
  redirect("/structures");
}
