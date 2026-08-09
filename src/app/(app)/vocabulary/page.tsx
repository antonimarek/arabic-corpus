import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, transliteration, part_of_speech, created_at, vocabulary_senses(gloss, lang)",
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
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-medium text-[var(--ink)]">Vocabulary</h1>
        <Link
          href="/vocabulary/new"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          New word
        </Link>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No vocabulary yet. Add a word you met in a lesson or chat.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {rows.map((row) => {
            const senses = row.vocabulary_senses ?? [];
            const gloss = senses
              .map((s) => `${s.gloss} (${s.lang})`)
              .join(" · ");
            return (
              <li key={row.id}>
                <Link
                  href={`/vocabulary/${row.id}`}
                  className="flex flex-col gap-1.5 py-4 hover:opacity-80"
                >
                  <span
                    className="font-arabic text-xl text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {row.arabic}
                  </span>
                  <span className="text-[15px] text-[var(--ink-muted)]">
                    {[row.transliteration, row.part_of_speech, gloss]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
