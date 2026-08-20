import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deletePattern,
  linkVocabularyToPattern,
  setPatternMastery,
  unlinkVocabularyFromPattern,
} from "@/app/(app)/patterns/actions";
import { PatternDiscover } from "@/app/(app)/patterns/pattern-discover";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { firstGloss } from "@/lib/arabic-links";
import {
  inductivePairs,
  isMasteryState,
  isPatternRole,
  MASTERY_LABEL,
  MASTERY_STATES,
  PATTERN_ROLE_LABEL,
  PATTERN_ROLES,
  type PatternMember,
  type PatternRole,
} from "@/lib/patterns";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";
import { rootsMatch } from "@/lib/option-filter";

type PatternDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function PatternDetailPage({
  params,
}: PatternDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pattern, error } = await supabase
    .from("morph_patterns")
    .select(
      `*,
      pattern_vocabulary(
        role,
        vocabulary(
          id,
          arabic,
          transliteration,
          root,
          vocabulary_senses(gloss, created_at),
          example_vocabulary(
            examples(id, arabic, translation, texts(title))
          )
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

  if (!pattern) {
    notFound();
  }

  const members: PatternMember[] = (pattern.pattern_vocabulary ?? [])
    .map((row) => {
      const vocab = row.vocabulary;
      if (!vocab) return null;
      const role: PatternRole = isPatternRole(row.role) ? row.role : "related";
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

  const byRole = {
    base: members.filter((m) => m.role === "base"),
    derived: members.filter((m) => m.role === "derived"),
    related: members.filter((m) => m.role === "related"),
  };

  const pairs = inductivePairs(members);
  const mastery = isMasteryState(pattern.mastery_state)
    ? pattern.mastery_state
    : "noticed";

  const examplesMap = new Map<
    string,
    {
      id: string;
      arabic: string;
      translation: string | null;
      sourceTitle: string | null;
      vocabHints: string[];
    }
  >();
  for (const row of pattern.pattern_vocabulary ?? []) {
    const vocab = row.vocabulary;
    if (!vocab) continue;
    for (const link of vocab.example_vocabulary ?? []) {
      const example = link.examples;
      if (!example) continue;
      const existing = examplesMap.get(example.id);
      if (existing) {
        if (!existing.vocabHints.includes(vocab.arabic)) {
          existing.vocabHints.push(vocab.arabic);
        }
        continue;
      }
      examplesMap.set(example.id, {
        id: example.id,
        arabic: example.arabic,
        translation: example.translation,
        sourceTitle: example.texts?.title ?? null,
        vocabHints: [vocab.arabic],
      });
    }
  }
  const examples = [...examplesMap.values()];

  const memberIds = new Set(members.map((m) => m.vocabularyId));
  const familyRoots = [
    ...new Set(members.map((m) => m.root).filter(notNull)),
  ];
  let linkOptions: { id: string; label: string; hint?: string | null }[] = [];
  const { data: allVocab } = await supabase
    .from("vocabulary")
    .select("id, arabic, transliteration, root, vocabulary_senses(gloss, created_at)")
    .order("arabic");

  if (allVocab) {
    const preferred = allVocab.filter((row) => {
      if (memberIds.has(row.id)) return false;
      if (familyRoots.length === 0) return true;
      return familyRoots.some((root) => rootsMatch(root, row.root));
    });
    const pool = preferred.length > 0 ? preferred : allVocab.filter((row) => !memberIds.has(row.id));
    linkOptions = pool.slice(0, 200).map((row) => ({
      id: row.id,
      label: row.arabic,
      hint: [row.transliteration, firstGloss(row.vocabulary_senses)]
        .filter(Boolean)
        .join(" · "),
    }));
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex flex-col gap-1">
            {pattern.arabic_sketch ? (
              <p
                className="font-arabic text-[1.75rem] leading-relaxed text-[var(--ink)]"
                lang="ar"
                dir="rtl"
              >
                {pattern.arabic_sketch}
              </p>
            ) : null}
            <h1 className="text-xl font-medium text-[var(--ink)]">
              {pattern.name}
            </h1>
          </div>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/patterns/${pattern.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <ConfirmDelete action={deletePattern.bind(null, pattern.id)} />
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {[
            MASTERY_LABEL[mastery],
            pattern.form_label,
            `${members.length} word${members.length === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <PatternDiscover
        pairs={pairs}
        memberArabic={members.map((m) => m.arabic)}
        cue={pattern.cue}
        meaningShift={pattern.meaning_shift}
      />

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Mastery</h2>
        <form
          action={setPatternMastery.bind(null, pattern.id)}
          className="flex flex-wrap gap-2"
        >
          {MASTERY_STATES.map((state) => (
            <button
              key={state}
              type="submit"
              name="mastery_state"
              value={state}
              className={`min-h-10 rounded-md border px-3 py-2 text-sm ${
                mastery === state
                  ? "border-[var(--accent)] text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {MASTERY_LABEL[state]}
            </button>
          ))}
        </form>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
          Words ({members.length})
        </h2>
        {(["base", "derived", "related"] as const).map((role) => {
          const group = byRole[role];
          if (group.length === 0) return null;
          return (
            <div key={role} className="mb-5">
              <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                {PATTERN_ROLE_LABEL[role]}
              </h3>
              <ul className="flex flex-col gap-3">
                {group.map((member) => (
                  <li
                    key={member.vocabularyId}
                    className="flex items-start justify-between gap-3"
                  >
                    <Link
                      href={`/vocabulary/${member.vocabularyId}`}
                      className="flex min-w-0 flex-col gap-0.5"
                    >
                      <span
                        className="font-arabic text-lg text-[var(--accent)] hover:underline"
                        lang="ar"
                        dir="rtl"
                      >
                        {member.arabic}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {[member.transliteration, member.gloss]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                    <form
                      action={unlinkVocabularyFromPattern.bind(
                        null,
                        pattern.id,
                        member.vocabularyId,
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
            </div>
          );
        })}

        <form
          action={linkVocabularyToPattern.bind(null, pattern.id)}
          className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-4"
        >
          <h3 className="text-sm text-[var(--ink-muted)]">Link a word</h3>
          <label className="flex flex-col gap-2">
            <span className="sr-only">Word</span>
            <select
              name="vocabulary_id"
              required
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
              defaultValue=""
            >
              <option value="" disabled>
                Pick a word…
              </option>
              {linkOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.hint ? ` — ${option.hint}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Role</span>
            <select
              name="role"
              defaultValue="derived"
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            >
              {PATTERN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PATTERN_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="self-start text-sm text-[var(--accent)] hover:underline"
          >
            Link word
          </button>
        </form>
      </section>

      {pattern.notes ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {pattern.notes}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
          Examples ({examples.length})
        </h2>
        <ExampleList
          examples={examples}
          emptyMessage="No linked examples yet. Add examples on the words in this pattern."
        />
      </section>
    </article>
  );
}
