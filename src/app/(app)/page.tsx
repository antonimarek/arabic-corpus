import Link from "next/link";

import { ContinueLastText } from "@/components/continue-last-text";
import { SearchResults } from "@/components/search-results";
import { SentenceCapture } from "@/components/sentence-capture";
import { TodayHome } from "@/components/today-home";
import { createClient } from "@/lib/supabase/server";
import { searchCorpus, type SearchResult } from "@/lib/search";
import { loadSessionCandidates } from "@/lib/session-data";

type SearchHomeProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchHomePage({ searchParams }: SearchHomeProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const supabase = await createClient();

  let result: SearchResult | null = null;
  let errorMessage: string | null = null;
  let recentExamples: {
    id: string;
    arabic: string;
    translation: string | null;
  }[] = [];
  let candidates: Awaited<ReturnType<typeof loadSessionCandidates>> = [];

  if (query) {
    try {
      result = await searchCorpus(supabase, query);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Search failed.";
    }
  } else {
    const [{ data: examples }, sessionCandidates] = await Promise.all([
      supabase
        .from("examples")
        .select("id, arabic, translation")
        .order("created_at", { ascending: false })
        .limit(5),
      loadSessionCandidates(supabase),
    ]);
    recentExamples = examples ?? [];
    candidates = sessionCandidates;
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
          className="ui-input px-4 py-3.5 text-base"
        />
      </form>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!query ? (
        <div className="flex flex-col gap-8">
          <TodayHome candidates={candidates} />
          <ContinueLastText />
          <SentenceCapture />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <span className="text-[var(--ink-muted)]">More</span>
            <Link
              href="/texts/new"
              className="text-[var(--ink-muted)] hover:text-[var(--accent)]"
            >
              Text
            </Link>
            <Link
              href="/vocabulary/new"
              className="text-[var(--ink-muted)] hover:text-[var(--accent)]"
            >
              Vocab
            </Link>
            <Link
              href="/structures/new"
              className="text-[var(--ink-muted)] hover:text-[var(--accent)]"
            >
              Structure
            </Link>
            <Link
              href="/examples/new"
              className="text-[var(--ink-muted)] hover:text-[var(--accent)]"
            >
              Example
            </Link>
            <Link
              href="/manual/sources"
              className="text-[var(--ink-muted)] hover:text-[var(--accent)]"
            >
              Sources
            </Link>
          </div>

          {recentExamples.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-[var(--ink-muted)]">
                Recent examples
              </h2>
              <ul className="flex flex-col gap-2">
                {recentExamples.map((example) => (
                  <li key={example.id}>
                    <Link href={`/examples/${example.id}`} className="ui-row">
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
          ) : (
            <p className="text-[15px] text-[var(--ink-muted)]">
              Save a sentence you just heard, or start with a Shwayy section.
              See Sources if you forget what to import.
            </p>
          )}
        </div>
      ) : hits.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-[var(--ink-muted)]">
            No matches for “{query}”.
          </p>
          <Link
            href={`/examples/new?arabic=${encodeURIComponent(query)}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add as new example
          </Link>
        </div>
      ) : (
        <SearchResults hits={hits} />
      )}
    </section>
  );
}
