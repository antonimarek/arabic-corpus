import Link from "next/link";

import { FilteredEntityList } from "@/components/filtered-entity-list";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

export default async function TextsPage() {
  const supabase = await createClient();
  const { data: texts, error } = await supabase
    .from("texts")
    .select(
      "id, title, arabic, source, occurred_on, created_at, audio_path, text_tags(tags(name))",
    )
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
        <FilteredEntityList
          rows={texts.map((text) => ({
            id: text.id,
            href: `/texts/${text.id}`,
            tags:
              text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [],
            title: text.title,
            arabic: text.arabic,
            subtitle:
              [
                text.audio_path ? "Audio" : "No audio",
                text.source,
                text.occurred_on,
              ]
                .filter(Boolean)
                .join(" · ") ||
              new Date(text.created_at).toLocaleDateString(),
          }))}
        />
      )}
    </section>
  );
}
