import Link from "next/link";
import { notFound } from "next/navigation";

import { attachVocabularyForm, deleteVocabulary, deleteVocabularyForm } from "@/app/(app)/vocabulary/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { firstGloss } from "@/lib/arabic-links";
import {
  citationArabic,
  citationSlotForPos,
  extraForms,
  headwordLabel,
  pairLabel,
  posKind,
} from "@/lib/citation";
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
      "*, vocabulary_senses(*), vocabulary_tags(tags(name)), vocabulary_forms(id, arabic, slot), example_vocabulary(examples(id, arabic, translation, source_line, texts(id, title)))",
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
  const kind = posKind(vocabulary.part_of_speech);
  const pairSlot = citationSlotForPos(vocabulary.part_of_speech);
  const pairArabic = pairSlot
    ? citationArabic(vocabulary.vocabulary_forms, pairSlot)
    : null;
  const alsoMatches = extraForms(vocabulary.vocabulary_forms);
  const pairName = pairLabel(kind);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          {pairName ? (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-4" dir="rtl">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--ink-muted)]" dir="ltr">
                  {headwordLabel(kind)}
                </span>
                <h1
                  className="font-arabic text-3xl leading-relaxed text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {vocabulary.arabic}
                </h1>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--ink-muted)]" dir="ltr">
                  {pairName}
                </span>
                {pairArabic ? (
                  <p
                    className="font-arabic text-3xl leading-relaxed text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {pairArabic}
                  </p>
                ) : (
                  <form
                    action={attachVocabularyForm.bind(null, vocabulary.id)}
                    className="flex flex-col gap-2"
                  >
                    <input type="hidden" name="slot" value={pairSlot ?? ""} />
                    <input
                      name="arabic"
                      required
                      dir="rtl"
                      lang="ar"
                      placeholder={kind === "verb" ? "بكتب" : "كتب"}
                      className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xl outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="submit"
                      className="self-start text-sm text-[var(--accent)] hover:underline"
                      dir="ltr"
                    >
                      Add {pairName.toLowerCase()}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <h1
              className="font-arabic text-3xl leading-relaxed text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              {vocabulary.arabic}
            </h1>
          )}
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
        <p className="text-xs text-[var(--ink-muted)]">
          Search treats vowel marks and no vowel marks as the same word.
        </p>
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

      <section>
        <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
          Also matches ({alsoMatches.length})
        </h2>
        {alsoMatches.length === 0 ? (
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            Extra surfaces from texts (كتبوا, كلت). Not for memorizing.
          </p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {alsoMatches.map((form) => (
              <li
                key={form.id}
                className="flex items-center justify-between gap-3"
              >
                <span
                  className="font-arabic text-lg text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {form.arabic}
                </span>
                <form
                  action={deleteVocabularyForm.bind(
                    null,
                    form.id,
                    vocabulary.id,
                  )}
                >
                  <button
                    type="submit"
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form
          action={attachVocabularyForm.bind(null, vocabulary.id)}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            name="arabic"
            required
            dir="rtl"
            lang="ar"
            placeholder="بكتبوا"
            className="font-arabic min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-lg outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="self-start text-sm text-[var(--accent)] hover:underline"
          >
            Add form
          </button>
        </form>
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
