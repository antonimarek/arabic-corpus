import Link from "next/link";

import { FilteredEntityList } from "@/components/filtered-entity-list";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

export default async function StructuresPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("structures")
    .select(
      "id, name, arabic_form, meaning, created_at, example_structures(example_id), structure_tags(tags(name))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load structures: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-[var(--ink)]">
            Structures
          </h1>
          <Link href="/structures/new" className="ui-btn-new">
            New structure
          </Link>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          Phrase frames and chunks (بدي + فعل, عم + …). Word-formation moves
          live under Patterns.
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No structures yet. Capture a chunk or idiom you keep meeting.
        </p>
      ) : (
        <FilteredEntityList
          rows={rows.map((row) => {
            const count = row.example_structures?.length ?? 0;
            return {
              id: row.id,
              href: `/structures/${row.id}`,
              tags:
                row.structure_tags
                  ?.map((link) => link.tags?.name)
                  .filter(notNull) ?? [],
              title: row.arabic_form ? undefined : row.name,
              arabic: row.arabic_form,
              subtitle: [
                row.arabic_form ? row.name : null,
                row.meaning,
                `${count} example${count === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · "),
            };
          })}
        />
      )}
    </section>
  );
}
