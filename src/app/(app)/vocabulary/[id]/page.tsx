import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteVocabulary } from "@/app/(app)/vocabulary/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type VocabularyDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function VocabularyDetailPage({
  params,
}: VocabularyDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: vocabulary, error } = await supabase
    .from("vocabulary")
    .select(
      "*, vocabulary_senses(*), vocabulary_tags(tags(name)), example_vocabulary(examples(id, arabic, translation))",
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

  if (!vocabulary) {
    notFound();
  }

  const tags =
    vocabulary.vocabulary_tags
      ?.map((row) => row.tags?.name)
      .filter(notNull) ?? [];
  const examples =
    vocabulary.example_vocabulary
      ?.map((row) => row.examples)
      .filter(notNull) ?? [];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1
            className="font-arabic text-3xl leading-relaxed text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {vocabulary.arabic}
          </h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/vocabulary/${vocabulary.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <ConfirmDelete action={deleteVocabulary.bind(null, vocabulary.id)} />
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {[vocabulary.transliteration, vocabulary.part_of_speech]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {vocabulary.root ? (
          <p
            className="font-arabic text-lg text-[var(--ink-muted)]"
            lang="ar"
            dir="rtl"
          >
            {vocabulary.root}
          </p>
        ) : null}
        {tags.length > 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{tags.join(" · ")}</p>
        ) : null}
      </header>

      <section>
        <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Senses</h2>
        <ul className="flex flex-col gap-2">
          {(vocabulary.vocabulary_senses ?? []).map((sense) => (
              <li key={sense.id} className="text-[15px] text-[var(--ink)]">
                {sense.gloss}{" "}
                <span className="text-xs text-[var(--ink-muted)]">
                  ({sense.lang})
                </span>
              </li>
            ))}
        </ul>
      </section>

      {vocabulary.notes ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {vocabulary.notes}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({examples.length})
          </h2>
          <Link
            href={`/examples/new?vocabulary=${vocabulary.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        {examples.length === 0 ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            No linked examples yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {examples.map((example) => (
                <li key={example.id}>
                  <Link
                    href={`/examples/${example.id}`}
                    className="flex flex-col gap-1 py-3 hover:opacity-80"
                  >
                    <span
                      className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
                      lang="ar"
                      dir="rtl"
                    >
                      {example.arabic}
                    </span>
                    {example.translation ? (
                      <span className="text-sm text-[var(--ink-muted)]">
                        {example.translation}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </article>
  );
}
