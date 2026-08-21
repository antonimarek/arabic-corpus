import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { parseSuggestionPayload } from "@/lib/pattern-discover/payload";

export default async function PatternSuggestionsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("pattern_suggestions")
    .select(
      "id, name, arabic_sketch, confidence, reasoning, payload, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load suggestions: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs text-[var(--ink-muted)]">
          <Link href="/patterns" className="hover:underline">
            Patterns
          </Link>
          {" · "}
          Suggestions
        </p>
        <h1 className="text-xl font-medium text-[var(--ink)]">Suggestions</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Deterministic candidates from your vocabulary. Confirm what looks
          real. Dismiss noise. Not AI notes.
        </p>
      </header>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No pending suggestions. Run{" "}
          <code className="text-xs">npm run discover:patterns</code> on your
          machine after you add more words.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const payload = parseSuggestionPayload(row.payload);
            return (
              <li key={row.id}>
                <Link
                  href={`/patterns/suggestions/${row.id}`}
                  className="ui-row gap-1"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-medium text-[var(--ink)]">
                      {row.name}
                    </span>
                    <span className="text-xs text-[var(--ink-muted)]">
                      {row.confidence}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {[
                      row.arabic_sketch,
                      `${payload.pairs.length} pair${payload.pairs.length === 1 ? "" : "s"}`,
                      row.reasoning,
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
