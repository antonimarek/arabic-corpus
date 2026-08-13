import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteExample } from "@/app/(app)/examples/actions";
import { ArabicReader } from "@/components/arabic-reader";
import { ConfirmDelete } from "@/components/confirm-delete";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";
import { lineHref } from "@/lib/text-lines";

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
      "*, texts(id, title), example_tags(tags(name)), example_vocabulary(vocabulary(id, arabic)), example_structures(structures(id, name, arabic_form))",
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

  const links: ArabicLink[] = [
    ...vocabulary.map((row) => ({
      phrase: row.arabic,
      href: `/vocabulary/${row.id}`,
      kind: "vocabulary" as const,
    })),
    ...structures
      .filter((row) => row.arabic_form)
      .map((row) => ({
        phrase: row.arabic_form as string,
        href: `/structures/${row.id}`,
        kind: "structure" as const,
      })),
  ];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="sr-only">{example.arabic}</h1>
        <div className="flex items-start justify-end gap-3 text-sm">
          <Link
            href={`/examples/${example.id}/edit`}
            className="text-[var(--accent)] hover:underline"
          >
            Edit
          </Link>
          <ConfirmDelete action={deleteExample.bind(null, example.id)} />
        </div>
        {tags.length > 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{tags.join(" · ")}</p>
        ) : null}
      </header>

      <ArabicReader
        arabic={example.arabic}
        translation={example.translation}
        transliteration={example.transliteration}
        links={links}
        size="example"
        textId={text?.id}
        sourceLine={example.source_line}
      />

      {text ? (
        <section className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Source text</h2>
          <Link
            href={`/texts/${text.id}`}
            className="text-[15px] text-[var(--accent)] hover:underline"
          >
            {text.title}
          </Link>
          {example.source_line != null ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              Line{" "}
              <Link
                href={lineHref(text.id, example.source_line)}
                className="text-[var(--accent)] hover:underline"
              >
                {example.source_line}
              </Link>
            </p>
          ) : null}
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
                  {row.arabic_form ? (
                    <span
                      className="font-arabic ms-2 text-[var(--ink-muted)]"
                      lang="ar"
                      dir="rtl"
                    >
                      {row.arabic_form}
                    </span>
                  ) : null}
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
