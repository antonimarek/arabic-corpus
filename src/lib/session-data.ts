import { linePlaybackWindow, normalizeLineStarts } from "@/lib/audio";
import { signedTextAudioUrl } from "@/lib/audio-storage";
import type { CorpusClient } from "@/lib/corpus/write";
import { startOfUtcDay } from "@/lib/review";
import type { SessionTextCandidate } from "@/lib/session";

export type RetrieveCard = {
  reviewId: string;
  exampleId: string;
  arabic: string;
  translation: string | null;
  textId: string | null;
  textTitle: string | null;
  sourceLine: number | null;
  audioUrl: string | null;
  startMs: number | null;
  endMs: number | null;
};

export type LearnCandidate = {
  id: string;
  arabic: string;
  translation: string | null;
  sourceLine: number | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type ExampleJoin = {
  id: string;
  arabic: string;
  translation: string | null;
  source_line: number | null;
  text_id: string | null;
  texts: {
    id: string;
    title: string;
    audio_path: string | null;
    audio_duration_ms: number | null;
    audio_line_starts_ms: number[] | null;
  } | null;
};

export async function loadSessionCandidates(
  supabase: CorpusClient,
): Promise<SessionTextCandidate[]> {
  const now = new Date().toISOString();
  const [{ data: texts, error: textError }, { data: dueRows, error: dueError }] =
    await Promise.all([
      supabase
        .from("texts")
        .select("id, title, audio_path, text_vocabulary(vocabulary_id)")
        .order("created_at", { ascending: false }),
      supabase
        .from("review_items")
        .select("example_id, examples(text_id)")
        .lte("due", now),
    ]);
  if (textError) throw new Error(textError.message);
  if (dueError) throw new Error(dueError.message);

  const dueByText = new Map<string, number>();
  for (const row of dueRows ?? []) {
    const textId = one(row.examples)?.text_id;
    if (!textId) continue;
    dueByText.set(textId, (dueByText.get(textId) ?? 0) + 1);
  }

  return (texts ?? []).map((text) => ({
    id: text.id,
    title: text.title,
    hasAudio: Boolean(text.audio_path),
    focusCount: text.text_vocabulary?.length ?? 0,
    dueExampleCount: dueByText.get(text.id) ?? 0,
  }));
}

export async function countEnrolledToday(
  supabase: CorpusClient,
  now = new Date(),
): Promise<number> {
  const { count, error } = await supabase
    .from("review_items")
    .select("id", { count: "exact", head: true })
    .gte("enrolled_at", startOfUtcDay(now).toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadDueCards(
  supabase: CorpusClient,
  limit = 8,
): Promise<RetrieveCard[]> {
  const { data, error } = await supabase
    .from("review_items")
    .select(
      "id, example_id, examples(id, arabic, translation, source_line, text_id, texts(id, title, audio_path, audio_duration_ms, audio_line_starts_ms))",
    )
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return mapRetrieveCards(supabase, data ?? []);
}

async function mapRetrieveCards(
  supabase: CorpusClient,
  rows: Array<{
    id: string;
    example_id: string;
    examples: ExampleJoin | ExampleJoin[] | null;
  }>,
): Promise<RetrieveCard[]> {
  const cards: RetrieveCard[] = [];
  const urlCache = new Map<string, string | null>();
  for (const row of rows) {
    const example = one(row.examples);
    if (!example) continue;
    const text = example.texts;
    let audioUrl: string | null = null;
    if (text?.audio_path) {
      if (!urlCache.has(text.audio_path)) {
        urlCache.set(
          text.audio_path,
          await signedTextAudioUrl(supabase, text.audio_path),
        );
      }
      audioUrl = urlCache.get(text.audio_path) ?? null;
    }
    const starts = normalizeLineStarts(text?.audio_line_starts_ms);
    const span =
      example.source_line != null
        ? linePlaybackWindow(
            starts,
            example.source_line,
            text?.audio_duration_ms ?? null,
          )
        : null;
    cards.push({
      reviewId: row.id,
      exampleId: example.id,
      arabic: example.arabic,
      translation: example.translation,
      textId: text?.id ?? example.text_id,
      textTitle: text?.title ?? null,
      sourceLine: example.source_line,
      audioUrl,
      startMs: span?.startMs ?? null,
      endMs: span?.endMs ?? null,
    });
  }
  return cards;
}

export async function loadLearnCandidates(
  supabase: CorpusClient,
  textId: string,
): Promise<LearnCandidate[]> {
  const [{ data: examples, error }, { data: enrolled, error: enrolledError }] =
    await Promise.all([
      supabase
        .from("examples")
        .select("id, arabic, translation, source_line")
        .eq("text_id", textId)
        .order("source_line", { ascending: true }),
      supabase.from("review_items").select("example_id"),
    ]);
  if (error) throw new Error(error.message);
  if (enrolledError) throw new Error(enrolledError.message);
  const taken = new Set((enrolled ?? []).map((row) => row.example_id));
  return (examples ?? [])
    .filter((row) => !taken.has(row.id))
    .map((row) => ({
      id: row.id,
      arabic: row.arabic,
      translation: row.translation,
      sourceLine: row.source_line,
    }));
}

export async function loadFluencyText(
  supabase: CorpusClient,
  finishedId: string,
) {
  const { data, error } = await supabase
    .from("texts")
    .select("id, title, arabic, audio_path, audio_duration_ms, audio_line_starts_ms")
    .eq("id", finishedId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.audio_path) return null;
  return {
    id: data.id,
    title: data.title,
    arabic: data.arabic,
    audioUrl: await signedTextAudioUrl(supabase, data.audio_path),
    durationMs: data.audio_duration_ms,
    lineStarts: data.audio_line_starts_ms,
  };
}
