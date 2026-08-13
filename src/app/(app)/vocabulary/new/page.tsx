import Link from "next/link";

import { VocabularyForm } from "@/app/(app)/vocabulary/vocabulary-form";
import { lookupPhraseHits } from "@/lib/lookup-phrase";
import { createClient } from "@/lib/supabase/server";

type NewVocabularyProps = {
  searchParams: Promise<{ arabic?: string }>;
};

export default async function NewVocabularyPage({
  searchParams,
}: NewVocabularyProps) {
  const params = await searchParams;
  const defaultArabic = params.arabic?.trim() ?? "";
  let existing:
    | { id: string; arabic: string; gloss?: string }
    | null = null;

  if (defaultArabic) {
    const supabase = await createClient();
    const hits = await lookupPhraseHits(supabase, defaultArabic);
    const vocab = hits.find((hit) => hit.type === "vocabulary");
    if (vocab) {
      existing = { id: vocab.id, arabic: vocab.arabic, gloss: vocab.gloss };
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New vocabulary</h1>
      {existing ? (
        <p className="text-sm text-[var(--ink)]">
          Already in the corpus:{" "}
          <Link
            href={`/vocabulary/${existing.id}`}
            className="font-arabic text-[var(--accent)] hover:underline"
            lang="ar"
            dir="rtl"
          >
            {existing.arabic}
          </Link>
          {existing.gloss ? (
            <span className="text-[var(--ink-muted)]">
              {" "}
              · {existing.gloss}
            </span>
          ) : null}
          . Open that card to add a sense.
        </p>
      ) : null}
      <VocabularyForm mode="create" defaultArabic={defaultArabic || undefined} />
    </section>
  );
}
