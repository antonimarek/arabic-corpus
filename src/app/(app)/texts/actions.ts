"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateTextRecord, writeText } from "@/lib/corpus/write";
import { emptyToNull, parseTagNames } from "@/lib/form";
import { requireUserId } from "@/lib/require-user";

export type TextFormState = {
  error?: string;
};

function formInput(formData: FormData, title: string, arabic: string) {
  return {
    title,
    arabic,
    translation: emptyToNull(formData.get("translation")),
    source: emptyToNull(formData.get("source")),
    occurred_on: emptyToNull(formData.get("occurred_on")),
    notes: emptyToNull(formData.get("notes")),
    tags: parseTagNames(formData.get("tags")),
  };
}

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
  const result = await writeText(
    supabase,
    userId,
    formInput(formData, title, arabic),
  );
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/texts");
  revalidatePath("/");
  redirect(`/texts/${result.id}`);
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
  const result = await updateTextRecord(
    supabase,
    userId,
    id,
    formInput(formData, title, arabic),
  );
  if ("error" in result) {
    return { error: result.error };
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
