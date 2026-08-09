import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteExample } from "@/app/(app)/examples/actions";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type ExampleDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ExampleDetailPage({
  params,
}: ExampleDetailProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: example, error } = await supabase
    .from("examples")
    .select(
      "*, texts(id, title), example_tags(tags(name)), example_vocabulary(vocabulary(id, arabic)), example_structures(structures(id, name))",
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

  if (!example) {
    notFound();
  }

  const tags =
    example.example_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const vocabulary =
    example.example_vocabulary
      ?.map((row) => row.vocabulary)
      .filter(notNull) ?? [];
  const structures =
    example.example_structures
      ?.map((row) => row.structures)
      .filter(notNull) ?? [];
  const text = example.texts;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium text-[var(--ink)]">Example</h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/examples/${example.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <form action={deleteExample.bind(null, example.id)}>
              <button
                type="submit"
                className="text-[var(--danger)] hover:underline"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
        {tags.length > 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{tags.join(" · ")}</p>
        ) : null}
      </header>

      <div
        className="font-arabic whitespace-pre-wrap text-2xl leading-[1.9] text-[var(--ink)]"
        lang="ar"
        dir="rtl"
      >
        {example.arabic}
      </div>

      {example.transliteration ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          {example.transliteration}
        </p>
      ) : null}

      {example.translation ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Translation</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {example.translation}
          </p>
        </section>
      ) : null}

      {text ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Source text</h2>
          <Link
            href={`/texts/${text.id}`}
            className="text-[15px] text-[var(--accent)] hover:underline"
          >
            {text.title}
          </Link>
        </section>
      ) : null}

      {vocabulary.length > 0 ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Vocabulary</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {vocabulary.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/vocabulary/${row.id}`}
                  className="font-arabic text-lg text-[var(--accent)] hover:underline"
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

      {structures.length > 0 ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Structures</h2>
          <ul className="flex flex-col gap-2">
            {structures.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/structures/${row.id}`}
                  className="text-[15px] text-[var(--accent)] hover:underline"
                >
                  {row.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {example.notes ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {example.notes}
          </p>
        </section>
      ) : null}
    </article>
  );
}
