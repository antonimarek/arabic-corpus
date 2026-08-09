import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function TextsPage() {
  const supabase = await createClient();
  const { data: texts, error } = await supabase
    .from("texts")
    .select("id, title, arabic, source, occurred_on, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load texts: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-medium text-[var(--ink)]">Texts</h1>
        <Link
          href="/texts/new"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          New text
        </Link>
      </div>

      {!texts || texts.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No texts yet. Paste a short story or lesson note to start your corpus.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {texts.map((text) => (
            <li key={text.id}>
              <Link
                href={`/texts/${text.id}`}
                className="flex flex-col gap-2 py-4 hover:opacity-80"
              >
                <span className="text-[15px] font-medium text-[var(--ink)]">
                  {text.title}
                </span>
                <span
                  className="font-arabic line-clamp-2 text-lg leading-relaxed text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {text.arabic}
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  {[text.source, text.occurred_on].filter(Boolean).join(" · ") ||
                    new Date(text.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
