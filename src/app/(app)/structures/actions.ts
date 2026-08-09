"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyToNull, parseIdList, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";
import { syncTags } from "@/lib/tags";

export type StructureFormState = {
  error?: string;
};

async function syncExampleLinks(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  structureId: string,
  exampleIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("example_structures")
    .delete()
    .eq("structure_id", structureId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (exampleIds.length === 0) {
    return {};
  }

  const { error: insertError } = await supabase
    .from("example_structures")
    .insert(
      exampleIds.map((exampleId) => ({
        example_id: exampleId,
        structure_id: structureId,
      })),
    );

  if (insertError) {
    return { error: insertError.message };
  }

  return {};
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
  const { data, error } = await supabase
    .from("structures")
    .insert({
      owner_id: userId,
      name,
      arabic_form: emptyToNull(formData.get("arabic_form")),
      transliteration: emptyToNull(formData.get("transliteration")),
      meaning: emptyToNull(formData.get("meaning")),
      explanation: emptyToNull(formData.get("explanation")),
      notes: emptyToNull(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save structure." };
  }

  const linkResult = await syncExampleLinks(
    supabase,
    data.id,
    parseIdList(formData, "example_ids"),
  );
  if (linkResult.error) {
    return { error: linkResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "structure", entityId: data.id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/structures");
  revalidatePath("/");
  redirect(`/structures/${data.id}`);
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
  const { error } = await supabase
    .from("structures")
    .update({
      name,
      arabic_form: emptyToNull(formData.get("arabic_form")),
      transliteration: emptyToNull(formData.get("transliteration")),
      meaning: emptyToNull(formData.get("meaning")),
      explanation: emptyToNull(formData.get("explanation")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const linkResult = await syncExampleLinks(
    supabase,
    id,
    parseIdList(formData, "example_ids"),
  );
  if (linkResult.error) {
    return { error: linkResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "structure", entityId: id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
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
