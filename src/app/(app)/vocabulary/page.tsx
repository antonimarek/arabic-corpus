import { Suspense } from "react";
import Link from "next/link";

import { VocabularyList } from "@/app/(app)/vocabulary/vocabulary-list";
import {
  citationArabic,
  citationSlotForPos,
  posKind,
} from "@/lib/citation";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, transliteration, part_of_speech, created_at, vocabulary_senses(gloss, lang, created_at), vocabulary_forms(arabic, slot), vocabulary_tags(tags(name))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load vocabulary: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-[var(--ink)]">
          Vocabulary
        </h1>
        <Link href="/vocabulary/new" className="ui-btn-new">
          New word
        </Link>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No vocabulary yet. Add a word you met in a lesson or chat.
        </p>
      ) : (
        <Suspense
          fallback={
            <p className="text-[15px] text-[var(--ink-muted)]">
              Loading vocabulary…
            </p>
          }
        >
          <VocabularyList
            rows={rows.map((row) => {
              const senses = [...(row.vocabulary_senses ?? [])].sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              );
              const gloss = senses[0]?.gloss ?? null;
              const slot = citationSlotForPos(row.part_of_speech);
              const pair = slot
                ? citationArabic(row.vocabulary_forms, slot)
                : null;
              return {
                id: row.id,
                href: `/vocabulary/${row.id}`,
                tags:
                  row.vocabulary_tags
                    ?.map((link) => link.tags?.name)
                    .filter(notNull) ?? [],
                arabic: row.arabic,
                arabicPair: pair,
                transliteration: row.transliteration,
                partOfSpeech: row.part_of_speech,
                gloss,
                kind: posKind(row.part_of_speech),
                createdAt: row.created_at,
              };
            })}
          />
        </Suspense>
      )}
    </section>
  );
}
