"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyToNull, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";
import { syncTags } from "@/lib/tags";

export type TextFormState = {
  error?: string;
};

export async function createText(
  _prev: TextFormState,
  formData: FormData,
): Promise<TextFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const arabic = String(formData.get("arabic") ?? "").trim();

  if (!title || !arabic) {
    return { error: "Title and Arabic text are required." };
  }

  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("texts")
    .insert({
      owner_id: userId,
      title,
      arabic,
      translation: emptyToNull(formData.get("translation")),
      source: emptyToNull(formData.get("source")),
      occurred_on: emptyToNull(formData.get("occurred_on")),
      notes: emptyToNull(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save text." };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "text", entityId: data.id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/texts");
  revalidatePath("/");
  redirect(`/texts/${data.id}`);
}

export async function updateText(
  id: string,
  _prev: TextFormState,
  formData: FormData,
): Promise<TextFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const arabic = String(formData.get("arabic") ?? "").trim();

  if (!title || !arabic) {
    return { error: "Title and Arabic text are required." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("texts")
    .update({
      title,
      arabic,
      translation: emptyToNull(formData.get("translation")),
      source: emptyToNull(formData.get("source")),
      occurred_on: emptyToNull(formData.get("occurred_on")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const tagResult = await syncTags(
    supabase,
    userId,
    { kind: "text", entityId: id },
    parseTagNames(formData.get("tags")),
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  revalidatePath("/texts");
  revalidatePath(`/texts/${id}`);
  revalidatePath("/");
  redirect(`/texts/${id}`);
}

export async function deleteText(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("texts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/texts");
  revalidatePath("/");
  redirect("/texts");
}
