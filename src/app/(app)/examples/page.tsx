import Link from "next/link";

import { FilteredEntityList } from "@/components/filtered-entity-list";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

export default async function ExamplesPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("examples")
    .select(
      "id, arabic, translation, notes, created_at, example_tags(tags(name))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load examples: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-[var(--ink)]">
          Examples
        </h1>
        <Link href="/examples/new" className="ui-btn-new">
          New example
        </Link>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No examples yet. Save a sentence from home or from a text line.
        </p>
      ) : (
        <FilteredEntityList
          rows={rows.map((row) => ({
            id: row.id,
            href: `/examples/${row.id}`,
            tags:
              row.example_tags?.map((link) => link.tags?.name).filter(notNull) ??
              [],
            arabic: row.arabic,
            subtitle: row.translation,
            note: row.notes,
          }))}
        />
      )}
    </section>
  );
}
