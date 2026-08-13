import Link from "next/link";

import { ReindexEmbeddingsButton } from "@/components/reindex-embeddings-button";
import { isEmbeddingConfigured } from "@/lib/embeddings";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const semanticReady = isEmbeddingConfigured();
  const { data: misses } = await supabase
    .from("search_misses")
    .select("id, query, created_at")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium text-[var(--ink)]">Admin</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Corpus hygiene. Not part of daily study.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">Import</h2>
        <Link
          href="/admin/imports"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Local import review
        </Link>
      </div>

      {semanticReady ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-[var(--ink-muted)]">
            Semantic index
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Rebuild embeddings after adding lots of material.
          </p>
          <ReindexEmbeddingsButton />
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          Semantic search is off until an embedding key is set on the host.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">
          Recent search misses
        </h2>
        {!misses || misses.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {misses.map((miss) => (
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
        )}
      </div>
    </section>
  );
}
