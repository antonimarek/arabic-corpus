import { firstGloss, structureLink, vocabularyLink } from "@/lib/arabic-links";
import { signedTextAudioUrl } from "@/lib/audio-storage";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { notNull } from "@/lib/tags";
import type { CorpusClient } from "@/lib/corpus/write";

export const textQueryKey = (id: string) => ["text", id] as const;

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
  tags: string[];
  links: ArabicLink[];
  knownLinks: ArabicLink[];
  focus: FocusTarget[];
  vocabOptions: VocabOption[];
  examples: Array<{
    id: string;
    arabic: string;
    translation: string | null;
    transliteration: string | null;
    source_line: number | null;
    vocabHints: string[];
  }>;
};

const TEXT_DETAIL_SELECT = `
  *,
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
    source_line,
    example_vocabulary(
      vocabulary(
        id,
        arabic,
        vocabulary_senses(gloss, created_at),
        vocabulary_forms(arabic)
      )
    ),
    example_structures(structures(id, name, arabic_form, meaning))
  )
`;

export async function fetchTextDetail(
  supabase: CorpusClient,
  id: string,
): Promise<TextDetailPayload> {
  const [{ data: text, error }, { data: vocabRows, error: vocabError }] =
    await Promise.all([
      supabase.from("texts").select(TEXT_DETAIL_SELECT).eq("id", id).maybeSingle(),
      supabase
        .from("vocabulary")
        .select(
          "id, arabic, vocabulary_senses(gloss, created_at), vocabulary_forms(arabic)",
        )
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    throw new Error(error.message);
  }
  if (vocabError) {
    throw new Error(vocabError.message);
  }
  if (!text) {
    throw new Error("Text not found");
  }

  const tags =
    text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const examples = text.examples ?? [];

  const focusRows = [...(text.text_vocabulary ?? [])].sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
  const focusVocab = focusRows
    .map((row) => row.vocabulary)
    .filter(notNull);
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
  const vocabOptions: VocabOption[] = [];
  for (const row of vocabRows ?? []) {
    vocabOptions.push({
      id: row.id,
      arabic: row.arabic,
      gloss: firstGloss(row.vocabulary_senses),
    });
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
    audioUrl: await signedTextAudioUrl(supabase, text.audio_path),
    tags,
    links: [...linkMap.values()],
    knownLinks,
    focus: focusVocab.map((vocab) => ({
      id: vocab.id,
      arabic: vocab.arabic,
      gloss: firstGloss(vocab.vocabulary_senses),
    })),
    vocabOptions,
    examples: examples.map((example) => ({
      id: example.id,
      arabic: example.arabic,
      translation: example.translation,
      transliteration: example.transliteration,
      source_line: example.source_line ?? null,
      vocabHints:
        example.example_vocabulary
          ?.map((row) => row.vocabulary?.arabic)
          .filter(notNull) ?? [],
    })),
  };
}
