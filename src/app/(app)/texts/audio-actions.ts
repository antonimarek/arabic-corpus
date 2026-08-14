"use server";

import { revalidatePath } from "next/cache";

import { toStoredLineStarts } from "@/lib/audio";
import { removeTextAudioObjects } from "@/lib/audio-storage";
import { requireUserId } from "@/lib/require-user";

function revalidateText(textId: string) {
  revalidatePath("/");
  revalidatePath("/texts");
  revalidatePath(`/texts/${textId}`);
  revalidatePath(`/texts/${textId}/edit`);
  revalidatePath("/today");
}

export async function saveTextAudioMeta(
  textId: string,
  input: { path: string; durationMs: number | null },
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUserId();
  const { data: existing } = await supabase
    .from("texts")
    .select("audio_path")
    .eq("id", textId)
    .maybeSingle();
  if (!existing) return { error: "Text not found." };

  if (existing.audio_path && existing.audio_path !== input.path) {
    await supabase.storage.from("text-audio").remove([existing.audio_path]);
  }

  const { error } = await supabase
    .from("texts")
    .update({
      audio_path: input.path,
      audio_duration_ms: input.durationMs,
      audio_line_starts_ms: null,
    })
    .eq("id", textId)
    .eq("owner_id", userId);
  if (error) return { error: error.message };
  revalidateText(textId);
  return {};
}

export async function saveTextLineStarts(
  textId: string,
  starts: (number | null)[],
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("texts")
    .update({ audio_line_starts_ms: toStoredLineStarts(starts) })
    .eq("id", textId)
    .eq("owner_id", userId);
  if (error) return { error: error.message };
  revalidateText(textId);
  return {};
}

export async function clearTextAudio(
  textId: string,
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUserId();
  const removed = await removeTextAudioObjects(supabase, userId, textId);
  if (removed.error) return { error: removed.error };
  const { error } = await supabase
    .from("texts")
    .update({
      audio_path: null,
      audio_duration_ms: null,
      audio_line_starts_ms: null,
    })
    .eq("id", textId)
    .eq("owner_id", userId);
  if (error) return { error: error.message };
  revalidateText(textId);
  return {};
}
