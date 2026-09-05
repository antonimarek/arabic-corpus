import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteStructure } from "@/app/(app)/structures/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type StructureDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function StructureDetailPage({
  params,
}: StructureDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: structure, error } = await supabase
    .from("structures")
    .select(
      `*,
      structure_tags(tags(name)),
      example_structures(
        examples(
          id,
          arabic,
          translation,
          transliteration,
          notes,
          texts(title),
          example_vocabulary(vocabulary(id, arabic, transliteration))
        )
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

  if (!structure) {
    notFound();
  }

  const tags =
    structure.structure_tags?.map((row) => row.tags?.name).filter(notNull) ??
    [];
  const examples =
    structure.example_structures
      ?.map((row) => row.examples)
      .filter(notNull) ?? [];

  const relatedVocab = new Map<
    string,
    { id: string; arabic: string; transliteration: string | null }
  >();
  for (const example of examples) {
    for (const row of example.example_vocabulary ?? []) {
      const vocab = row.vocabulary;
      if (!vocab) continue;
      relatedVocab.set(vocab.id, vocab);
    }
  }
  const related = [...relatedVocab.values()];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          {structure.arabic_form ? (
            <h1
              className="font-arabic text-[1.75rem] leading-relaxed text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              {structure.arabic_form}
            </h1>
          ) : (
            <h1 className="text-xl font-medium text-[var(--ink)]">
              {structure.name}
            </h1>
          )}
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/structures/${structure.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <ConfirmDelete action={deleteStructure.bind(null, structure.id)} />
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {[
            structure.arabic_form ? structure.name : null,
            structure.transliteration,
            structure.meaning,
            `${examples.length} example${examples.length === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {tags.length > 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{tags.join(" · ")}</p>
        ) : null}
      </header>

      {structure.explanation ? (
        <section>
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Explanation</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {structure.explanation}
          </p>
        </section>
      ) : null}

      {structure.notes ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {structure.notes}
          </p>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
            Related vocabulary ({related.length})
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-3">
            {related.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/vocabulary/${row.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span
                    className="font-arabic text-lg text-[var(--accent)] hover:underline"
                    lang="ar"
                    dir="rtl"
                  >
                    {row.arabic}
                  </span>
                  {row.transliteration ? (
                    <span className="text-xs text-[var(--ink-muted)]">
                      {row.transliteration}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({examples.length})
          </h2>
          <Link
            href={`/examples/new?structure=${structure.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        <ExampleList
          examples={examples.map((example) => ({
            id: example.id,
            arabic: example.arabic,
            translation: example.translation,
            transliteration: example.transliteration,
            notes: example.notes,
            sourceTitle: example.texts?.title ?? null,
            vocabHints:
              example.example_vocabulary
                ?.map((row) => row.vocabulary?.arabic)
                .filter(notNull) ?? [],
          }))}
        />
      </section>
    </article>
  );
}
