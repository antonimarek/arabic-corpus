import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteStructure } from "@/app/(app)/structures/actions";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type StructureDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function StructureDetailPage({
  params,
}: StructureDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: structure, error } = await supabase
    .from("structures")
    .select(
      "*, structure_tags(tags(name)), example_structures(examples(id, arabic, translation))",
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

  if (!structure) {
    notFound();
  }

  const tags =
    structure.structure_tags?.map((row) => row.tags?.name).filter(notNull) ??
    [];
  const examples =
    structure.example_structures
      ?.map((row) => row.examples)
      .filter(notNull) ?? [];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium text-[var(--ink)]">
            {structure.name}
          </h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/structures/${structure.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <form action={deleteStructure.bind(null, structure.id)}>
              <button
                type="submit"
                className="text-[var(--danger)] hover:underline"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
        {structure.arabic_form ? (
          <p
            className="font-arabic text-2xl leading-relaxed text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {structure.arabic_form}
          </p>
        ) : null}
        <p className="text-sm text-[var(--ink-muted)]">
          {[structure.transliteration, structure.meaning]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {tags.length > 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{tags.join(" · ")}</p>
        ) : null}
      </header>

      {structure.explanation ? (
        <section>
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Explanation</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {structure.explanation}
          </p>
        </section>
      ) : null}

      {structure.notes ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {structure.notes}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({examples.length})
          </h2>
          <Link
            href={`/examples/new?structure=${structure.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        {examples.length === 0 ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            No linked examples yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {examples.map((example) => (
                <li key={example.id}>
                  <Link
                    href={`/examples/${example.id}`}
                    className="flex flex-col gap-1 py-3 hover:opacity-80"
                  >
                    <span
                      className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
                      lang="ar"
                      dir="rtl"
                    >
                      {example.arabic}
                    </span>
                    {example.translation ? (
                      <span className="text-sm text-[var(--ink-muted)]">
                        {example.translation}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </article>
  );
}
