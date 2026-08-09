import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteText } from "@/app/(app)/texts/actions";
import { ArabicReader } from "@/components/arabic-reader";
import { ExampleList } from "@/components/example-list";
import type { ArabicLink } from "@/lib/highlight-arabic";
import { createClient } from "@/lib/supabase/server";
import { notNull } from "@/lib/tags";

type TextPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TextDetailPage({ params }: TextPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: text, error } = await supabase
    .from("texts")
    .select(
      `*,
      text_tags(tags(name)),
      examples(
        id,
        arabic,
        translation,
        transliteration,
        example_vocabulary(vocabulary(id, arabic)),
        example_structures(structures(id, name, arabic_form))
      )`,
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

  if (!text) {
    notFound();
  }

  const tags =
    text.text_tags?.map((row) => row.tags?.name).filter(notNull) ?? [];
  const examples = text.examples ?? [];

  const linkMap = new Map<string, ArabicLink>();
  for (const example of examples) {
    for (const row of example.example_vocabulary ?? []) {
      const vocab = row.vocabulary;
      if (!vocab?.arabic) continue;
      linkMap.set(`v:${vocab.id}`, {
        phrase: vocab.arabic,
        href: `/vocabulary/${vocab.id}`,
        kind: "vocabulary",
      });
    }
    for (const row of example.example_structures ?? []) {
      const structure = row.structures;
      if (!structure?.arabic_form) continue;
      linkMap.set(`s:${structure.id}`, {
        phrase: structure.arabic_form,
        href: `/structures/${structure.id}`,
        kind: "structure",
      });
    }
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium text-[var(--ink)]">{text.title}</h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/texts/${text.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <form action={deleteText.bind(null, text.id)}>
              <button
                type="submit"
                className="text-[var(--danger)] hover:underline"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {[text.source, text.occurred_on, ...tags].filter(Boolean).join(" · ")}
        </p>
      </header>

      <ArabicReader
        arabic={text.arabic}
        translation={text.translation}
        links={[...linkMap.values()]}
        size="text"
      />

      {text.notes ? (
        <div className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {text.notes}
          </p>
        </div>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({examples.length})
          </h2>
          <Link
            href={`/examples/new?text=${text.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        <ExampleList
          examples={examples.map((example) => ({
            id: example.id,
            arabic: example.arabic,
            translation: example.translation,
            transliteration: example.transliteration,
            vocabHints:
              example.example_vocabulary
                ?.map((row) => row.vocabulary?.arabic)
                .filter(notNull) ?? [],
          }))}
          emptyMessage="No examples linked to this text yet."
        />
      </section>
    </article>
  );
}
