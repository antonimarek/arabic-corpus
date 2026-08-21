import Link from "next/link";
import { notFound } from "next/navigation";

import {
  confirmPatternSuggestion,
  dismissPatternSuggestion,
} from "@/app/(app)/patterns/suggestions/actions";
import { firstGloss } from "@/lib/arabic-links";
import {
  parseSuggestionPayload,
  signalLabels,
} from "@/lib/pattern-discover/payload";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type SuggestionDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function PatternSuggestionDetailPage({
  params,
}: SuggestionDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: suggestion, error } = await supabase
    .from("pattern_suggestions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {error.message}
      </p>
    );
  }
  if (!suggestion) {
    notFound();
  }

  const payload = parseSuggestionPayload(suggestion.payload);
  const memberIds = payload.member_ids;
  const { data: vocabRows } = memberIds.length
    ? await supabase
        .from("vocabulary")
        .select(
          "id, arabic, transliteration, vocabulary_senses(gloss, created_at)",
        )
        .in("id", memberIds)
    : { data: [] };

  const byId = new Map(
    (vocabRows ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        arabic: row.arabic,
        transliteration: row.transliteration,
        gloss: firstGloss(row.vocabulary_senses) ?? null,
      },
    ]),
  );

  const signals = signalLabels(suggestion.signals);
  const pending = suggestion.status === "pending";

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs text-[var(--ink-muted)]">
          <Link href="/patterns/suggestions" className="hover:underline">
            Suggestions
          </Link>
        </p>
        <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
          Potential pattern
        </p>
        <h1 className="text-xl font-medium text-[var(--ink)]">
          {suggestion.name}
        </h1>
        {suggestion.arabic_sketch ? (
          <p
            className="font-arabic text-2xl text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {suggestion.arabic_sketch}
          </p>
        ) : null}
        <p className="text-sm text-[var(--ink-muted)]">
          {[suggestion.confidence, suggestion.form_label, suggestion.status]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm text-[var(--ink-muted)]">Examples</h2>
        <ul className="flex flex-col gap-4">
          {payload.pairs.map((pair) => {
            const base = byId.get(pair.base_id);
            const derived = byId.get(pair.derived_id);
            return (
              <li
                key={`${pair.base_id}-${pair.derived_id}`}
                className="flex flex-col gap-1 border-b border-[var(--line)] pb-4"
              >
                <p
                  className="font-arabic text-xl text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {base?.arabic ?? "?"}
                  <span className="mx-2 text-[var(--ink-muted)]" dir="ltr">
                    →
                  </span>
                  {derived?.arabic ?? "?"}
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  {[base?.gloss, derived?.gloss].filter(Boolean).join(" → ")}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-[var(--ink-muted)]">
          What the system noticed
        </h2>
        {signals.length > 0 ? (
          <ul className="flex flex-col gap-1 text-[15px] text-[var(--ink)]">
            {signals.map((label) => (
              <li key={label}>✓ {label}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            {suggestion.reasoning ?? "No signal detail."}
          </p>
        )}
      </section>

      {(suggestion.meaning_shift || suggestion.ai_interpretation) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Suggested interpretation (hypothesis)
          </h2>
          <p className="text-[15px] leading-relaxed text-[var(--ink)]">
            {suggestion.ai_interpretation ?? suggestion.meaning_shift}
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Hypothesis only. Confirm does not write this into your notes.
          </p>
        </section>
      )}

      {memberIds.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-[var(--ink-muted)]">Related words</h2>
          <ul className="flex flex-wrap gap-2">
            {memberIds
              .map((memberId) => byId.get(memberId))
              .filter(notNull)
              .map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/vocabulary/${row.id}`}
                    className="inline-block rounded-md border border-[var(--line)] px-3 py-1.5 font-arabic text-lg text-[var(--accent)] hover:border-[var(--accent)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {row.arabic}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {pending ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-6">
          <form action={dismissPatternSuggestion.bind(null, suggestion.id)}>
            <button
              type="submit"
              className="text-sm text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline"
            >
              Dismiss
            </button>
          </form>
          <Link
            href={`/patterns/new?suggestion=${suggestion.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Edit pattern
          </Link>
          <form action={confirmPatternSuggestion.bind(null, suggestion.id)}>
            <button
              type="submit"
              className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
            >
              Confirm pattern
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          Status: {suggestion.status}
          {suggestion.confirmed_pattern_id ? (
            <>
              {" · "}
              <Link
                href={`/patterns/${suggestion.confirmed_pattern_id}`}
                className="text-[var(--accent)] hover:underline"
              >
                Open pattern
              </Link>
            </>
          ) : null}
        </p>
      )}
    </article>
  );
}
