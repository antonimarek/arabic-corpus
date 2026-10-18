import { PatternForm } from "@/app/(app)/patterns/pattern-form";
import { firstGloss } from "@/lib/arabic-links";
import { parseSuggestionPayload } from "@/lib/pattern-discover/payload";
import type { PatternPair, VocabOption } from "@/lib/patterns";
import { createClient } from "@/lib/supabase/server";

type NewPatternPageProps = {
  searchParams: Promise<{ vocabulary?: string; suggestion?: string }>;
};

function toVocabOption(row: {
  id: string;
  arabic: string;
  transliteration?: string | null;
  vocabulary_senses?: { gloss: string; created_at?: string }[] | null;
}): VocabOption {
  return {
    id: row.id,
    arabic: row.arabic,
    hint: [row.transliteration, firstGloss(row.vocabulary_senses)]
      .filter(Boolean)
      .join(" · "),
  };
}

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
    .order("created_at", { ascending: false })
    .limit(250);

  const optionMap = new Map<string, VocabOption>();
  for (const row of vocabRows ?? []) {
    optionMap.set(row.id, toVocabOption(row));
  }

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
      const pairIds = [
        ...new Set(
          payload.pairs.flatMap((pair) => [pair.base_id, pair.derived_id]),
        ),
      ];
      if (pairIds.length > 0) {
        const { data: pairVocab } = await supabase
          .from("vocabulary")
          .select(
            "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
          )
          .in("id", pairIds);
        for (const row of pairVocab ?? []) {
          optionMap.set(row.id, toVocabOption(row));
        }
      }
      defaults = {
        name: suggestion.name,
        arabic_sketch: suggestion.arabic_sketch,
        form_label: suggestion.form_label,
        cue: suggestion.cue,
        meaning_shift: suggestion.meaning_shift,
      };
    }
  } else if (vocabularyId) {
    let seed = (vocabRows ?? []).find((row) => row.id === vocabularyId);
    if (!seed) {
      const { data } = await supabase
        .from("vocabulary")
        .select(
          "id, arabic, transliteration, root, vocabulary_senses(gloss, created_at)",
        )
        .eq("id", vocabularyId)
        .maybeSingle();
      seed = data ?? undefined;
      if (seed) optionMap.set(seed.id, toVocabOption(seed));
    }
    if (seed) {
      seedArabic = seed.arabic;
      if (seed.root) {
        const { data: siblings } = await supabase
          .from("vocabulary")
          .select(
            "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
          )
          .eq("root", seed.root)
          .neq("id", vocabularyId)
          .limit(40);
        siblingOptions = (siblings ?? []).map(toVocabOption);
        for (const sibling of siblingOptions) {
          optionMap.set(sibling.id, sibling);
        }
      }
    }
  }

  const vocabOptions = [...optionMap.values()];

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
