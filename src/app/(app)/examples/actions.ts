"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyToNull, parseIdList, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";
import { syncTags } from "@/lib/tags";

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

async function syncExampleJoins(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  exampleId: string,
  vocabularyIds: string[],
  structureIds: string[],
) {
  const { error: deleteVocabError } = await supabase
    .from("example_vocabulary")
    .delete()
    .eq("example_id", exampleId);
  if (deleteVocabError) {
    return { error: deleteVocabError.message };
  }

  const { error: deleteStructError } = await supabase
    .from("example_structures")
    .delete()
    .eq("example_id", exampleId);
  if (deleteStructError) {
    return { error: deleteStructError.message };
  }

  if (vocabularyIds.length > 0) {
    const { error } = await supabase.from("example_vocabulary").insert(
      vocabularyIds.map((vocabularyId) => ({
        example_id: exampleId,
        vocabulary_id: vocabularyId,
      })),
    );
    if (error) {
      return { error: error.message };
    }
  }

  if (structureIds.length > 0) {
    const { error } = await supabase.from("example_structures").insert(
      structureIds.map((structureId) => ({
        example_id: exampleId,
        structure_id: structureId,
      })),
    );
    if (error) {
      return { error: error.message };
    }
  }

  return {};
}

export async function createExample(
  _prev: ExampleFormState,
  formData: FormData,
): Promise<ExampleFormState> {
  const arabic = String(formData.get("arabic") ?? "").trim();
  if (!arabic) {
    return { error: "Arabic is required." };
  }

  const { supabase, userId } = await requireUserId();
  const textId = emptyToNull(formData.get("text_id"));
  const sourceLine = parseSourceLine(formData);
  if (sourceLine != null && !textId) {
    return { error: "Source line requires a source text." };
  }

  const { data, error } = await supabase
    .from("examples")
    .insert({
      owner_id: userId,
      arabic,
      translation: emptyToNull(formData.get("translation")),
      transliteration: emptyToNull(formData.get("transliteration")),
      notes: emptyToNull(formData.get("notes")),
      text_id: textId,
      source_line: sourceLine,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save example." };
  }

  const joinResult = await syncExampleJoins(
    supabase,
    data.id,
    parseIdList(formData, "vocabulary_ids"),
    parseIdList(formData, "structure_ids"),
  );
  if (joinResult.error) {
    return { error: joinResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "example", entityId: data.id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/structures");
  if (textId) {
    revalidatePath(`/texts/${textId}`);
    revalidatePath("/texts");
  }
  redirect(`/examples/${data.id}`);
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

  const { supabase, userId } = await requireUserId();
  const textId = emptyToNull(formData.get("text_id"));
  const sourceLine = parseSourceLine(formData);
  if (sourceLine != null && !textId) {
    return { error: "Source line requires a source text." };
  }

  const { error } = await supabase
    .from("examples")
    .update({
      arabic,
      translation: emptyToNull(formData.get("translation")),
      transliteration: emptyToNull(formData.get("transliteration")),
      notes: emptyToNull(formData.get("notes")),
      text_id: textId,
      source_line: sourceLine,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const joinResult = await syncExampleJoins(
    supabase,
    id,
    parseIdList(formData, "vocabulary_ids"),
    parseIdList(formData, "structure_ids"),
  );
  if (joinResult.error) {
    return { error: joinResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "example", entityId: id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath(`/examples/${id}`);
  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/structures");
  if (textId) {
    revalidatePath(`/texts/${textId}`);
    revalidatePath("/texts");
  }
  redirect(`/examples/${id}`);
}

export async function deleteExample(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("examples").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/structures");
  redirect("/");
}
