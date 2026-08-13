import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteVocabulary } from "@/app/(app)/vocabulary/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { firstGloss } from "@/lib/arabic-links";
import { rootsMatch } from "@/lib/option-filter";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";
import { lineHref } from "@/lib/text-lines";

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
      "*, vocabulary_senses(*), vocabulary_tags(tags(name)), example_vocabulary(examples(id, arabic, translation, source_line, texts(id, title)))",
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
  const textIds = new Set(
    examples
      .map((example) => example.texts?.id)
      .filter((textId): textId is string => Boolean(textId)),
  );
  const exampleCount = examples.length;
  const textCount = textIds.size;

  let family: {
    id: string;
    arabic: string;
    transliteration: string | null;
    gloss?: string;
  }[] = [];
  if (vocabulary.root) {
    const { data: candidates } = await supabase
      .from("vocabulary")
      .select(
        "id, arabic, transliteration, root, vocabulary_senses(gloss, created_at)",
      )
      .neq("id", id)
      .not("root", "is", null);
    family = (candidates ?? [])
      .filter((row) => rootsMatch(vocabulary.root, row.root))
      .map((row) => ({
        id: row.id,
        arabic: row.arabic,
        transliteration: row.transliteration,
        gloss: firstGloss(row.vocabulary_senses),
      }));
  }

  const encounterBits = [
    exampleCount > 0
      ? `${exampleCount} example${exampleCount === 1 ? "" : "s"}`
      : null,
    textCount > 0
      ? `${textCount} text${textCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

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
          {[
            vocabulary.transliteration,
            vocabulary.part_of_speech,
            ...encounterBits,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {vocabulary.root ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Root{" "}
            <span
              className="font-arabic text-lg text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              {vocabulary.root}
            </span>
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

      {family.length > 0 ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
            Same root ({family.length})
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-3">
            {family.map((row) => (
              <li key={row.id}>
                <Link href={`/vocabulary/${row.id}`} className="flex flex-col gap-0.5">
                  <span
                    className="font-arabic text-lg text-[var(--accent)] hover:underline"
                    lang="ar"
                    dir="rtl"
                  >
                    {row.arabic}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {[row.transliteration, row.gloss]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
            Examples ({exampleCount})
          </h2>
          <Link
            href={`/examples/new?vocabulary=${vocabulary.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        <ExampleList
          examples={examples.map((example) => {
            const source = example.texts;
            const line = example.source_line;
            return {
              id: example.id,
              arabic: example.arabic,
              translation: example.translation,
              sourceTitle: source
                ? line != null
                  ? `${source.title} · line ${line}`
                  : source.title
                : line != null
                  ? `Line ${line}`
                  : null,
              sourceHref: source
                ? line != null
                  ? lineHref(source.id, line)
                  : `/texts/${source.id}`
                : undefined,
            };
          })}
          emptyMessage="No linked examples yet."
        />
      </section>
    </article>
  );
}
