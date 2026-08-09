import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteText } from "@/app/(app)/texts/actions";
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
    .select("*, text_tags(tags(name)), examples(id, arabic, translation)")
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

      <div
        className="font-arabic whitespace-pre-wrap text-2xl leading-[1.9] text-[var(--ink)]"
        lang="ar"
        dir="rtl"
      >
        {text.arabic}
      </div>

      {text.translation ? (
        <div className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Translation</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {text.translation}
          </p>
        </div>
      ) : null}

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
        {examples.length === 0 ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            No examples linked to this text yet.
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
