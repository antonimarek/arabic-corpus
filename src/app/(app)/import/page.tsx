import Link from "next/link";

import { IMPORT_BUNDLE_SCHEMA_TEXT } from "@/lib/import/bundle";
import { ORIGIN_COPY, ORIGIN_DEFAULT_VALUE } from "@/lib/import/origin";
import { IMPORT_PROMPTS } from "@/lib/import/prompts";
import { requireUserId } from "@/lib/require-user";

import { CopyPromptButton } from "./copy-prompt-button";
import { ImportIntakeForm } from "./intake-form";

export default async function ImportPage() {
  const { supabase } = await requireUserId();
  const { data: runs } = await supabase
    .from("import_runs")
    .select("id, source_label, status, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">Import</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Copy a prompt into any chat. Paste the JSON here. Review, then commit.
          Shwayy and other source rules live on{" "}
          <Link href="/manual/sources" className="text-[var(--accent)] hover:underline">
            Sources
          </Link>
          .
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--ink-muted)]">
          <li>Copy a prompt and attach your notes</li>
          <li>Set source and value, then paste or upload the JSON</li>
          <li>Keep or skip rows, then commit</li>
        </ol>
      </header>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">
          1. Copy a prompt
        </h2>
        <ul className="flex flex-col gap-4">
          {IMPORT_PROMPTS.map((prompt) => (
            <li
              key={prompt.id}
              className="flex flex-col gap-3 rounded-md border border-[var(--line)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)]">{prompt.title}</p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {prompt.summary}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {ORIGIN_COPY[prompt.origin].label} ·{" "}
                    {ORIGIN_DEFAULT_VALUE[prompt.origin]}
                  </p>
                </div>
                <CopyPromptButton text={prompt.text} />
              </div>
            </li>
          ))}
        </ul>
        <details className="text-sm text-[var(--ink-muted)]">
          <summary className="cursor-pointer text-[var(--ink)]">
            ImportBundle schema
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs">
            {IMPORT_BUNDLE_SCHEMA_TEXT}
          </pre>
        </details>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">
          2. Source, then JSON
        </h2>
        <ImportIntakeForm />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">
          Recent runs
        </h2>
        {!runs || runs.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">None yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {runs.map((run) => (
              <li key={run.id} className="py-3">
                <Link
                  href={`/import/${run.id}`}
                  className="flex flex-col gap-0.5 hover:opacity-80"
                >
                  <span className="text-sm text-[var(--ink)]">
                    {run.source_label || "Import"}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {run.status} · {run.created_at}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
