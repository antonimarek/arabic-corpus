import { notFound } from "next/navigation";

import { PatternForm } from "@/app/(app)/patterns/pattern-form";
import { firstGloss } from "@/lib/arabic-links";
import {
  isPatternRole,
  memberPairs,
  type PatternMember,
  type VocabOption,
} from "@/lib/patterns";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type EditPatternProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPatternPage({ params }: EditPatternProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: vocabRows }] = await Promise.all([
    supabase
      .from("morph_patterns")
      .select(
        `*,
        pattern_vocabulary(
          role,
          vocabulary(id, arabic, transliteration, root, vocabulary_senses(gloss, created_at))
        )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("vocabulary")
      .select(
        "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
      )
      .order("arabic"),
  ]);

  if (!data) {
    notFound();
  }

  const members: PatternMember[] = (data.pattern_vocabulary ?? [])
    .map((row) => {
      const vocab = row.vocabulary;
      if (!vocab) return null;
      const role = isPatternRole(row.role) ? row.role : "related";
      return {
        vocabularyId: vocab.id,
        arabic: vocab.arabic,
        transliteration: vocab.transliteration,
        gloss: firstGloss(vocab.vocabulary_senses) ?? null,
        role,
        root: vocab.root,
      };
    })
    .filter(notNull);

  const vocabOptions: VocabOption[] = (vocabRows ?? []).map((row) => ({
    id: row.id,
    arabic: row.arabic,
    hint: [row.transliteration, firstGloss(row.vocabulary_senses)]
      .filter(Boolean)
      .join(" · "),
  }));

  const { pattern_vocabulary: _links, ...pattern } = data;

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit pattern</h1>
      <PatternForm
        mode="edit"
        pattern={pattern}
        vocabOptions={vocabOptions}
        initialPairs={memberPairs(members)}
      />
    </section>
  );
}
