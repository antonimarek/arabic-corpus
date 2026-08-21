import { PatternForm } from "@/app/(app)/patterns/pattern-form";
import { firstGloss } from "@/lib/arabic-links";
import { rootsMatch } from "@/lib/option-filter";
import { parseSuggestionPayload } from "@/lib/pattern-discover/payload";
import type { PatternPair, VocabOption } from "@/lib/patterns";
import { createClient } from "@/lib/supabase/server";

type NewPatternPageProps = {
  searchParams: Promise<{ vocabulary?: string; suggestion?: string }>;
};

export default async function NewPatternPage({
  searchParams,
}: NewPatternPageProps) {
  const params = await searchParams;
  const vocabularyId = params.vocabulary?.trim() || undefined;
  const suggestionId = params.suggestion?.trim() || undefined;
  const supabase = await createClient();

  const { data: vocabRows } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, transliteration, root, vocabulary_senses(gloss, created_at)",
    )
    .order("arabic");

  const vocabOptions: VocabOption[] = (vocabRows ?? []).map((row) => ({
    id: row.id,
    arabic: row.arabic,
    hint: [row.transliteration, firstGloss(row.vocabulary_senses)]
      .filter(Boolean)
      .join(" · "),
  }));

  let seedArabic: string | undefined;
  let siblingOptions: VocabOption[] = [];
  let initialPairs: PatternPair[] | undefined;
  let defaults:
    | {
        name?: string;
        arabic_sketch?: string | null;
        form_label?: string | null;
        cue?: string | null;
        meaning_shift?: string | null;
      }
    | undefined;

  if (suggestionId) {
    const { data: suggestion } = await supabase
      .from("pattern_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .maybeSingle();
    if (suggestion) {
      const payload = parseSuggestionPayload(suggestion.payload);
      initialPairs = payload.pairs.map((pair) => ({
        baseId: pair.base_id,
        derivedId: pair.derived_id,
      }));
      defaults = {
        name: suggestion.name,
        arabic_sketch: suggestion.arabic_sketch,
        form_label: suggestion.form_label,
        cue: suggestion.cue,
        meaning_shift: suggestion.meaning_shift,
      };
    }
  } else if (vocabularyId) {
    const seed = (vocabRows ?? []).find((row) => row.id === vocabularyId);
    if (seed) {
      seedArabic = seed.arabic;
      if (seed.root) {
        siblingOptions = (vocabRows ?? [])
          .filter(
            (row) =>
              row.id !== vocabularyId && rootsMatch(seed.root, row.root),
          )
          .map((row) => ({
            id: row.id,
            arabic: row.arabic,
            hint: [row.transliteration, firstGloss(row.vocabulary_senses)]
              .filter(Boolean)
              .join(" · "),
          }));
      }
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">
          {suggestionId
            ? "Edit suggested pattern"
            : "Connect words into a pattern"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {suggestionId
            ? "Adjust pairs and wording, then save. This confirms the suggestion."
            : "Patterns = moves inside words. Structures = how you build phrases. Start from examples you already know, then name the move."}
        </p>
      </div>
      <PatternForm
        mode="create"
        vocabOptions={vocabOptions}
        siblingOptions={siblingOptions}
        seedVocabularyId={suggestionId ? undefined : vocabularyId}
        seedArabic={seedArabic}
        initialPairs={initialPairs}
        suggestionId={suggestionId}
        defaults={defaults}
      />
    </section>
  );
}
