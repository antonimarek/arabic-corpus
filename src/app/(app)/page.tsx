import Link from "next/link";

import { TypePill } from "@/components/type-pill";
import { createClient } from "@/lib/supabase/server";
import { hrefForHit, searchCorpus } from "@/lib/search";

type SearchHomeProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchHomePage({ searchParams }: SearchHomeProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  let hits: Awaited<ReturnType<typeof searchCorpus>> = [];
  let errorMessage: string | null = null;

  if (query) {
    const supabase = await createClient();
    try {
      hits = await searchCorpus(supabase, query);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Search failed.";
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <form className="flex flex-col gap-3" action="/" method="get">
        <label htmlFor="q" className="sr-only">
          Search corpus
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          autoFocus
          placeholder="مبارح · shu 3am · how do I say…"
          className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-base outline-none focus:border-[var(--accent)]"
        />
        <p className="text-sm text-[var(--ink-muted)]">
          Exact / substring search across texts, examples, vocabulary, and
          structures.
        </p>
      </form>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!query ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-[var(--ink-muted)]">
            Try next
          </h2>
          <p className="text-[15px] text-[var(--ink)]">
            Use Add to capture a text, word, structure, or example. Then search
            here.
          </p>
        </div>
      ) : hits.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No matches for “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {hits.map((hit) => (
            <li key={`${hit.type}:${hit.id}`}>
              <Link
                href={hrefForHit(hit)}
                className="flex flex-col gap-2 py-4 hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <TypePill type={hit.type} />
                  <span className="text-[15px] font-medium text-[var(--ink)]">
                    {hit.type === "example" || hit.type === "vocabulary" ? (
                      <span className="font-arabic" lang="ar" dir="rtl">
                        {hit.title}
                      </span>
                    ) : (
                      hit.title
                    )}
                  </span>
                </div>
                {hit.arabic &&
                hit.type !== "example" &&
                hit.type !== "vocabulary" ? (
                  <span
                    className="font-arabic line-clamp-2 text-lg leading-relaxed text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {hit.arabic}
                  </span>
                ) : null}
                {hit.subtitle ? (
                  <span className="line-clamp-2 text-sm text-[var(--ink-muted)]">
                    {hit.subtitle}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
