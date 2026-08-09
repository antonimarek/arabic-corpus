import Link from "next/link";

import { ReindexEmbeddingsButton } from "@/components/reindex-embeddings-button";
import { SearchResults } from "@/components/search-results";
import { isEmbeddingConfigured } from "@/lib/embeddings";
import { createClient } from "@/lib/supabase/server";
import { searchCorpus, type SearchResult } from "@/lib/search";

type SearchHomeProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchHomePage({ searchParams }: SearchHomeProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const supabase = await createClient();
  const semanticReady = isEmbeddingConfigured();

  let result: SearchResult | null = null;
  let errorMessage: string | null = null;
  let recentTexts: { id: string; title: string; arabic: string }[] = [];
  let recentExamples: {
    id: string;
    arabic: string;
    translation: string | null;
  }[] = [];
  let recentMisses: { id: string; query: string }[] = [];

  if (query) {
    try {
      result = await searchCorpus(supabase, query);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Search failed.";
    }
  } else {
    const [{ data: texts }, { data: examples }, { data: misses }] =
      await Promise.all([
        supabase
          .from("texts")
          .select("id, title, arabic")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("examples")
          .select("id, arabic, translation")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("search_misses")
          .select("id, query")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
    recentTexts = texts ?? [];
    recentExamples = examples ?? [];
    recentMisses = misses ?? [];
  }

  const hits = result?.hits ?? [];

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
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="مبارح · shu 3am · how do I say…"
          className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-base outline-none focus:border-[var(--accent)]"
        />
        <p className="text-sm text-[var(--ink-muted)]">
          Exact + fuzzy (trigram).{" "}
          {semanticReady
            ? "Semantic layer on when embeddings exist."
            : "Semantic optional — set OPENAI_API_KEY to enable."}
        </p>
      </form>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!query ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[var(--ink-muted)]">
              Capture
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { href: "/texts/new", label: "Text" },
                { href: "/vocabulary/new", label: "Vocab" },
                { href: "/structures/new", label: "Structure" },
                { href: "/examples/new", label: "Example" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3.5 text-center text-sm text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {recentTexts.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-[var(--ink-muted)]">
                Recent texts
              </h2>
              <ul className="flex flex-col divide-y divide-[var(--line)]">
                {recentTexts.map((text) => (
                  <li key={text.id}>
                    <Link
                      href={`/texts/${text.id}`}
                      className="flex flex-col gap-1 py-3 hover:opacity-80"
                    >
                      <span className="text-[15px] font-medium text-[var(--ink)]">
                        {text.title}
                      </span>
                      <span
                        className="font-arabic line-clamp-1 text-base text-[var(--ink-muted)]"
                        lang="ar"
                        dir="rtl"
                      >
                        {text.arabic}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recentExamples.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-[var(--ink-muted)]">
                Recent examples
              </h2>
              <ul className="flex flex-col divide-y divide-[var(--line)]">
                {recentExamples.map((example) => (
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
            </div>
          ) : null}

          {recentMisses.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-[var(--ink-muted)]">
                Recent search misses
              </h2>
              <ul className="flex flex-col gap-1.5">
                {recentMisses.map((miss) => (
                  <li key={miss.id}>
                    <Link
                      href={`/?q=${encodeURIComponent(miss.query)}`}
                      className="text-sm text-[var(--ink)] hover:underline"
                    >
                      {miss.query}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {semanticReady ? (
            <div className="border-t border-[var(--line)] pt-6">
              <h2 className="mb-2 text-sm font-medium text-[var(--ink-muted)]">
                Semantic index
              </h2>
              <p className="mb-3 text-sm text-[var(--ink-muted)]">
                Rebuild embeddings after adding lots of material.
              </p>
              <ReindexEmbeddingsButton />
            </div>
          ) : null}

          {recentTexts.length === 0 && recentExamples.length === 0 ? (
            <p className="text-[15px] text-[var(--ink)]">
              Corpus empty. Capture a text or example to start.
            </p>
          ) : null}
        </div>
      ) : hits.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-[var(--ink-muted)]">
            No exact or fuzzy matches for “{query}”.
            {result?.missLogged ? " Logged as a miss." : null}
          </p>
          {result?.layersTried?.length ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Layers tried: {result.layersTried.join(" · ")}
            </p>
          ) : null}
          <Link
            href="/examples/new"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add as new example
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result?.layersTried?.length ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Layers: {result.layersTried.join(" · ")} · {hits.length} hit
              {hits.length === 1 ? "" : "s"}
            </p>
          ) : null}
          <SearchResults hits={hits} />
        </div>
      )}
    </section>
  );
}
