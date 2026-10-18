import { cache } from "react";

import { firstGloss, structureLink, vocabularyLink } from "@/lib/arabic-links";
import { signedTextAudioUrl } from "@/lib/audio-storage";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { notNull } from "@/lib/tags";
import type { StudyPack } from "@/lib/transcribe/study-pack";
import { normalizeStudyPack } from "@/lib/transcribe/study-pack";
import type { CorpusClient } from "@/lib/corpus/write";
import { createClient } from "@/lib/supabase/server";
import { vocabularyMatchingText } from "@/lib/vocab-search";

export const textQueryKey = (id: string) => ["text", id] as const;
export const textStudyQueryKey = (id: string) => ["text", id, "study"] as const;

export type FocusTarget = {
  id: string;
  arabic: string;
  gloss?: string;
};

export type VocabOption = {
  id: string;
  arabic: string;
  gloss?: string;
};

export type TextDetailPayload = {
  id: string;
  title: string;
  arabic: string;
  translation: string | null;
  source: string | null;
  occurred_on: string | null;
  notes: string | null;
  audioPath: string | null;
  audioDurationMs: number | null;
  audioLineStartsMs: number[] | null;
  audioUrl: string | null;
  /** Null until Study tab loads extras (lessons). */
  studyPack: StudyPack | null;
  aiStudyPlan: string | null;
  tags: string[];
  links: ArabicLink[];
  knownLinks: ArabicLink[];
  focus: FocusTarget[];
  examples: Array<{
    id: string;
    arabic: string;
    translation: string | null;
    transliteration: string | null;
    notes: string | null;
    source_line: number | null;
    vocabHints: string[];
  }>;
};

export type TextShell = {
  id: string;
  title: string;
  arabic: string;
  source: string | null;
  occurred_on: string | null;
  tags: string[];
};

export type TextStudyExtras = {
  studyPack: StudyPack | null;
  aiStudyPlan: string | null;
};

const TEXT_DETAIL_SELECT = `
  id,
  title,
  arabic,
  translation,
  source,
  occurred_on,
  notes,
  audio_path,
  audio_duration_ms,
  audio_line_starts_ms,
  text_tags(tags(name)),
  text_vocabulary(
    created_at,
    vocabulary(
      id,
      arabic,
      vocabulary_senses(gloss, created_at),
      vocabulary_forms(arabic)
    )
  ),
  examples(
    id,
    arabic,
    translation,
    transliteration,
    notes,
    source_line,
    example_vocabulary(vocabulary(arabic)),
    example_structures(structures(id, name, arabic_form, meaning))
  )
`;

function parseStudyPack(value: unknown): StudyPack | null {
  return normalizeStudyPack(value);
}

export async function fetchTextShell(
  supabase: CorpusClient,
  id: string,
): Promise<TextShell | null> {
  const { data, error } = await supabase
    .from("texts")
    .select("id, title, arabic, source, occurred_on, text_tags(tags(name))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    arabic: data.arabic,
    source: data.source,
    occurred_on: data.occurred_on,
    tags: data.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [],
  };
}

export async function fetchTextStudyExtras(
  supabase: CorpusClient,
  id: string,
): Promise<TextStudyExtras> {
  const { data, error } = await supabase
    .from("texts")
    .select("study_pack, ai_study_plan")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Text not found");
  }
  return {
    studyPack: parseStudyPack(data.study_pack),
    aiStudyPlan: data.ai_study_plan ?? null,
  };
}

export async function fetchTextDetail(
  supabase: CorpusClient,
  id: string,
): Promise<TextDetailPayload> {
  const { data: text, error } = await supabase
    .from("texts")
    .select(TEXT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!text) {
    throw new Error("Text not found");
  }

  const [matchedVocab, audioUrl] = await Promise.all([
    vocabularyMatchingText(supabase, text.arabic),
    signedTextAudioUrl(supabase, text.audio_path),
  ]);

  const tags =
    text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const examples = text.examples ?? [];

  const focusRows = [...(text.text_vocabulary ?? [])].sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
  const focusVocab = focusRows.map((row) => row.vocabulary).filter(notNull);
  const focusIds = new Set(focusVocab.map((row) => row.id));

  const linkMap = new Map<string, ArabicLink>();
  for (const vocab of focusVocab) {
    if (!vocab.arabic) continue;
    linkMap.set(`v:${vocab.id}`, vocabularyLink(vocab));
  }
  for (const example of examples) {
    for (const row of example.example_structures ?? []) {
      const structure = row.structures;
      if (!structure) continue;
      const link = structureLink(structure);
      if (!link) continue;
      linkMap.set(`s:${structure.id}`, link);
    }
  }

  const knownLinks: ArabicLink[] = [];
  for (const row of matchedVocab) {
    if (focusIds.has(row.id)) continue;
    knownLinks.push(vocabularyLink({ ...row, kind: "known" }));
  }

  return {
    id: text.id,
    title: text.title,
    arabic: text.arabic,
    translation: text.translation,
    source: text.source,
    occurred_on: text.occurred_on,
    notes: text.notes,
    audioPath: text.audio_path ?? null,
    audioDurationMs: text.audio_duration_ms ?? null,
    audioLineStartsMs: text.audio_line_starts_ms ?? null,
    audioUrl,
    studyPack: null,
    aiStudyPlan: null,
    tags,
    links: [...linkMap.values()],
    knownLinks,
    focus: focusVocab.map((vocab) => ({
      id: vocab.id,
      arabic: vocab.arabic,
      gloss: firstGloss(vocab.vocabulary_senses),
    })),
    examples: examples.map((example) => ({
      id: example.id,
      arabic: example.arabic,
      translation: example.translation,
      transliteration: example.transliteration,
      notes: example.notes,
      source_line: example.source_line ?? null,
      vocabHints:
        example.example_vocabulary
          ?.map((row) => row.vocabulary?.arabic)
          .filter(notNull) ?? [],
    })),
  };
}

/** Same-request dedupe for RSC (Today + detail). */
export const fetchTextDetailCached = cache(async (id: string) => {
  const supabase = await createClient();
  return fetchTextDetail(supabase, id);
});
