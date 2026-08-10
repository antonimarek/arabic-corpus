"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { deleteText } from "@/app/(app)/texts/actions";
import { ExampleList } from "@/components/example-list";
import { TextLineReader } from "@/components/text-line-reader";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { createClient } from "@/lib/supabase/client";
import { notNull } from "@/lib/tags";
import { lineHref } from "@/lib/text-lines";

export type TextDetailPayload = {
  id: string;
  title: string;
  arabic: string;
  translation: string | null;
  source: string | null;
  occurred_on: string | null;
  notes: string | null;
  tags: string[];
  links: ArabicLink[];
  examples: Array<{
    id: string;
    arabic: string;
    translation: string | null;
    transliteration: string | null;
    source_line: number | null;
    vocabHints: string[];
  }>;
};

export const textQueryKey = (id: string) => ["text", id] as const;

async function fetchTextDetail(id: string): Promise<TextDetailPayload> {
  const supabase = createClient();
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
        example_vocabulary(vocabulary(id, arabic)),
        example_structures(structures(id, name, arabic_form))
      )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!text) {
    throw new Error("Text not found");
  }

  const tags =
    text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const examples = text.examples ?? [];

  const linkMap = new Map<string, ArabicLink>();
  for (const example of examples) {
    for (const row of example.example_vocabulary ?? []) {
      const vocab = row.vocabulary;
      if (!vocab?.arabic) continue;
      linkMap.set(`v:${vocab.id}`, {
        phrase: vocab.arabic,
        href: `/vocabulary/${vocab.id}`,
        kind: "vocabulary",
      });
    }
    for (const row of example.example_structures ?? []) {
      const structure = row.structures;
      if (!structure?.arabic_form) continue;
      linkMap.set(`s:${structure.id}`, {
        phrase: structure.arabic_form,
        href: `/structures/${structure.id}`,
        kind: "structure",
      });
    }
  }

  return {
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
}

export function TextDetailClient({
  textId,
  initialData,
}: {
  textId: string;
  initialData: TextDetailPayload;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: textQueryKey(textId),
    queryFn: () => fetchTextDetail(textId),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    queryClient.setQueryData(textQueryKey(textId), initialData);
  }, [initialData, queryClient, textId]);

  const text = data ?? initialData;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium text-[var(--ink)]">{text.title}</h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/texts/${text.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <form action={deleteText.bind(null, text.id)}>
              <button
                type="submit"
                className="text-[var(--danger)] hover:underline"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {[text.source, text.occurred_on, ...text.tags]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <TextLineReader
        textId={text.id}
        arabic={text.arabic}
        translation={text.translation}
        links={text.links}
        examples={text.examples.map((example) => ({
          id: example.id,
          arabic: example.arabic,
          sourceLine: example.source_line,
        }))}
      />

      {text.notes ? (
        <div className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {text.notes}
          </p>
        </div>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({text.examples.length})
          </h2>
          <Link
            href={`/examples/new?text=${text.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        <ExampleList
          examples={text.examples.map((example) => ({
            id: example.id,
            arabic: example.arabic,
            translation: example.translation,
            transliteration: example.transliteration,
            sourceTitle:
              example.source_line != null
                ? `Line ${example.source_line}`
                : undefined,
            sourceHref:
              example.source_line != null
                ? lineHref(text.id, example.source_line)
                : undefined,
            vocabHints: example.vocabHints,
          }))}
          emptyMessage="No examples linked to this text yet."
        />
      </section>
    </article>
  );
}
