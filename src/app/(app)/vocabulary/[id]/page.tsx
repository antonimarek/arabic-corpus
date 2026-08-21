import Link from "next/link";
import { notFound } from "next/navigation";

import { unlinkVocabularyFromPattern } from "@/app/(app)/patterns/actions";
import {
  attachVocabularyForm,
  deleteVocabulary,
  deleteVocabularyForm,
} from "@/app/(app)/vocabulary/actions";
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
import { isPatternRole, PATTERN_ROLE_LABEL } from "@/lib/patterns";
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
      `*,
      vocabulary_senses(*),
      vocabulary_tags(tags(name)),
      vocabulary_forms(id, arabic, slot),
      example_vocabulary(examples(id, arabic, translation, source_line, texts(id, title))),
      pattern_vocabulary(
        role,
        morph_patterns(id, name, mastery_state)
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

  const linkedPatterns = (vocabulary.pattern_vocabulary ?? [])
    .map((row) => {
      const pattern = row.morph_patterns;
      if (!pattern) return null;
      const role = isPatternRole(row.role) ? row.role : "related";
      return {
        id: pattern.id,
        name: pattern.name,
        role,
        roleLabel: PATTERN_ROLE_LABEL[role],
      };
    })
    .filter(notNull);

  type FamilyRow = {
    id: string;
    arabic: string;
    transliteration: string | null;
    gloss?: string;
    patternNames: string[];
  };

  let family: FamilyRow[] = [];
  if (vocabulary.root) {
    const { data: candidates } = await supabase
      .from("vocabulary")
      .select(
        `id, arabic, transliteration, root,
        vocabulary_senses(gloss, created_at),
        pattern_vocabulary(morph_patterns(name))`,
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
        patternNames: (row.pattern_vocabulary ?? [])
          .map((link) => link.morph_patterns?.name)
          .filter(notNull),
      }));
  }

  const familyLinked = family.filter((row) => row.patternNames.length > 0);
  const familyUnlinked = family.filter((row) => row.patternNames.length === 0);
  const familyTotal = family.length + (vocabulary.root ? 1 : 0);
  const patternsOnFamily = linkedPatterns.length;

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
                <p
                  className="font-arabic text-3xl leading-relaxed text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {pairArabic ?? "—"}
                </p>
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
            <ConfirmDelete
              action={deleteVocabulary.bind(null, vocabulary.id)}
            />
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {[
            vocabulary.transliteration,
            vocabulary.part_of_speech,
            vocabulary.root ? `root ${vocabulary.root}` : null,
            ...encounterBits,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
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

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            {vocabulary.root
              ? `Family · root ${vocabulary.root}`
              : "Patterns"}
          </h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/patterns/new?vocabulary=${vocabulary.id}`}
              className="text-[var(--accent)] hover:underline"
            >
              Connect into a pattern
            </Link>
            <Link
              href={`/vocabulary/${vocabulary.id}/link-pattern`}
              className="text-[var(--accent)] hover:underline"
            >
              Link to pattern
            </Link>
          </div>
        </div>

        <p className="mb-4 text-sm text-[var(--ink-muted)]">
          Patterns = moves inside words. Structures = how you build phrases.
        </p>

        {vocabulary.root ? (
          <p className="mb-4 text-sm text-[var(--ink-muted)]">
            {familyTotal} same-root word{familyTotal === 1 ? "" : "s"}
            {" · "}
            {patternsOnFamily} pattern
            {patternsOnFamily === 1 ? "" : "s"} on this word
            {family.length > 0
              ? ` · ${familyUnlinked.length} sibling${familyUnlinked.length === 1 ? "" : "s"} with no pattern yet`
              : null}
          </p>
        ) : (
          <p className="mb-4 text-sm text-[var(--ink-muted)]">
            Add a root on edit to see same-root siblings. You can still connect
            patterns.
          </p>
        )}

        {linkedPatterns.length > 0 ? (
          <ul className="mb-5 flex flex-col gap-3">
            {linkedPatterns.map((pattern) => (
              <li
                key={pattern.id}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/patterns/${pattern.id}`}
                  className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  <span className="truncate">{pattern.name}</span>
                  <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                    {pattern.roleLabel}
                  </span>
                </Link>
                <form
                  action={unlinkVocabularyFromPattern.bind(
                    null,
                    pattern.id,
                    vocabulary.id,
                  )}
                >
                  <button
                    type="submit"
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline"
                  >
                    Unlink
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-5 text-sm text-[var(--ink-muted)]">
            No patterns linked yet. Mark a move you keep seeing across words.
          </p>
        )}

        {family.length > 0 ? (
          <div className="flex flex-col gap-5">
            {familyLinked.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  Linked siblings
                </h3>
                <ul className="flex flex-wrap gap-x-4 gap-y-3">
                  {familyLinked.map((row) => (
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
                        <span className="text-xs text-[var(--ink-muted)]">
                          {[
                            row.transliteration,
                            row.gloss,
                            row.patternNames.join(", "),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {familyUnlinked.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  Unlinked in family
                </h3>
                <ul className="flex flex-wrap gap-x-4 gap-y-3">
                  {familyUnlinked.map((row) => (
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
                        <span className="text-xs text-[var(--ink-muted)]">
                          {[row.transliteration, row.gloss]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
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
