import {
  TEXT_AUDIO_BUCKET,
  textAudioPath,
} from "@/lib/audio";
import type { CorpusClient } from "@/lib/corpus/write";

export async function signedTextAudioUrl(
  supabase: CorpusClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(TEXT_AUDIO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeTextAudioObjects(
  supabase: CorpusClient,
  userId: string,
  textId: string,
): Promise<{ error?: string }> {
  const prefix = `${userId}/${textId}`;
  const { data, error } = await supabase.storage
    .from(TEXT_AUDIO_BUCKET)
    .list(prefix);
  if (error) return { error: error.message };
  const names = (data ?? []).map((row) => `${prefix}/${row.name}`);
  if (names.length === 0) return {};
  const removed = await supabase.storage.from(TEXT_AUDIO_BUCKET).remove(names);
  if (removed.error) return { error: removed.error.message };
  return {};
}

export { TEXT_AUDIO_BUCKET, textAudioPath };
