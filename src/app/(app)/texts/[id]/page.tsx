import { notFound } from "next/navigation";

import {
  TextDetailClient,
  type TextDetailPayload,
} from "@/components/text-detail-client";
import { structureLink, vocabularyLink } from "@/lib/arabic-links";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type TextPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TextDetailPage({ params }: TextPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: text, error } = await supabase
    .from("texts")
    .select(
      `*,
      text_tags(tags(name)),
      examples(
        id,
        arabic,
        translation,
        transliteration,
        source_line,
        example_vocabulary(vocabulary(id, arabic, vocabulary_senses(gloss, created_at))),
        example_structures(structures(id, name, arabic_form, meaning))
      )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {error.message}
      </p>
    );
  }

  if (!text) {
    notFound();
  }

  const tags =
    text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const examples = text.examples ?? [];

  const linkMap = new Map<string, ArabicLink>();
  for (const example of examples) {
    for (const row of example.example_vocabulary ?? []) {
      const vocab = row.vocabulary;
      if (!vocab?.arabic) continue;
      linkMap.set(`v:${vocab.id}`, vocabularyLink(vocab));
    }
    for (const row of example.example_structures ?? []) {
      const structure = row.structures;
      if (!structure) continue;
      const link = structureLink(structure);
      if (!link) continue;
      linkMap.set(`s:${structure.id}`, link);
    }
  }

  const initialData: TextDetailPayload = {
    id: text.id,
    title: text.title,
    arabic: text.arabic,
    translation: text.translation,
    source: text.source,
    occurred_on: text.occurred_on,
    notes: text.notes,
    tags,
    links: [...linkMap.values()],
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

  return <TextDetailClient textId={text.id} initialData={initialData} />;
}
