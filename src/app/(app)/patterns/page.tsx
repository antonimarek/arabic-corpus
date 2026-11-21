import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isMasteryState, MASTERY_LABEL } from "@/lib/patterns";

export default async function PatternsPage() {
  const supabase = await createClient();
  const [
    { data: rows, error },
    { count: pendingCount },
  ] = await Promise.all([
    supabase
      .from("morph_patterns")
      .select(
        "id, name, arabic_sketch, form_label, mastery_state, updated_at, pattern_vocabulary(vocabulary_id)",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("pattern_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load patterns: {error.message}
      </p>
    );
  }

  const pending = pendingCount ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-[var(--ink)]">
            Patterns
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {pending > 0 ? (
              <Link
                href="/patterns/suggestions"
                className="text-[var(--accent)] hover:underline"
              >
                Suggestions ({pending})
              </Link>
            ) : (
              <Link
                href="/patterns/suggestions"
                className="text-[var(--ink-muted)] hover:underline"
              >
                Suggestions
              </Link>
            )}
            <Link href="/patterns/new" className="ui-btn-new">
              Connect words
            </Link>
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          Moves inside words (علم → علّم). Review suggestions from your lexicon,
          or connect pairs yourself. Not phrase frames — those live under
          Structures.
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No confirmed patterns yet. Run discover on your machine, or connect
          words by hand.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const count = row.pattern_vocabulary?.length ?? 0;
            const mastery = isMasteryState(row.mastery_state)
              ? MASTERY_LABEL[row.mastery_state]
              : row.mastery_state;
            return (
              <li key={row.id}>
                <Link href={`/patterns/${row.id}`} className="ui-row gap-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-medium text-[var(--ink)]">
                      {row.name}
                    </span>
                    {row.arabic_sketch ? (
                      <span
                        className="font-arabic shrink-0 text-lg text-[var(--ink-muted)]"
                        lang="ar"
                        dir="rtl"
                      >
                        {row.arabic_sketch}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {[
                      mastery,
                      row.form_label,
                      `${count} word${count === 1 ? "" : "s"}`,
                    ]
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
