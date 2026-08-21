import Link from "next/link";
import { notFound } from "next/navigation";

import {
  citationWarning,
  hrefForEntity,
  itemLabel,
  itemSubtitle,
} from "@/lib/import/bundle";
import { provenanceFromBundle } from "@/lib/import/origin";
import { findExistingMatches } from "@/lib/import/match";
import { buildPreviewRow } from "@/lib/import/preview";
import { requireUserId } from "@/lib/require-user";

import { readBundle, readCounts, readDecisions } from "@/lib/import/run";
import { CommitBar } from "../commit-bar";
import { DecisionToggle } from "../decision-toggle";
import { ProvenanceBar } from "../provenance-bar";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ImportRunPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUserId();
  const { data: run } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!run) {
    notFound();
  }

  const bundle = readBundle(run);
  const stored = readDecisions(run);
  const counts = readCounts(run);
  const existing = await findExistingMatches(supabase, bundle.items);
  const rows = bundle.items.map((item, index) =>
    buildPreviewRow(index, item, existing[index], stored[String(index)]),
  );
  const keepCount = rows.filter((row) => row.decision === "keep").length;
  const committed = run.status === "committed";
  const provenance = provenanceFromBundle(bundle);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--ink-muted)]">
          <Link href="/import" className="text-[var(--accent)] hover:underline">
            Import
          </Link>
        </p>
        <h1 className="text-xl font-medium text-[var(--ink)]">
          {run.source_label || "Import run"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {rows.length} items · {run.status} · {provenance.origin} ·{" "}
          {provenance.value}
        </p>
      </header>

      {!committed ? (
        <ProvenanceBar
          runId={run.id}
          origin={provenance.origin}
          value={provenance.value}
        />
      ) : null}

      {committed && counts ? (
        <div className="flex flex-col gap-3 rounded-md border border-[var(--line)] p-4">
          <p className="text-sm text-[var(--ink)]">
            Inserted {counts.inserted} · updated {counts.updated} · skipped{" "}
            {counts.skipped} · failed {counts.failed}
          </p>
          {counts.created.length > 0 || counts.updatedItems.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {[...counts.created, ...counts.updatedItems]
                .slice(0, 8)
                .map((created, i) => (
                <li key={`${created.type}-${created.id}-${i}`}>
                  <Link
                    href={hrefForEntity(created.type, created.id)}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    {created.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {counts.inserted >= 20 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Large batch. Rebuild embeddings from Admin if semantic search is on.
            </p>
          ) : null}
          {counts.failures.length > 0 ? (
            <ul className="text-sm text-[var(--danger)]">
              {counts.failures.map((failure) => (
                <li key={failure.index}>
                  Row {failure.index + 1}: {failure.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ol className="flex flex-col divide-y divide-[var(--line)]">
        {rows.map((row) => {
          const subtitle = itemSubtitle(row.item);
          const warning = citationWarning(row.item);
          return (
            <li key={row.index} className="flex flex-col gap-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    {row.item.type}
                    {row.matchStatus === "exact_duplicate"
                      ? " · already in corpus"
                      : row.matchStatus === "enrichable"
                        ? " · update existing"
                        : row.matchStatus === "invalid"
                          ? " · invalid"
                          : ""}
                  </p>
                  <p
                    className="font-arabic text-lg text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {itemLabel(row.item)}
                  </p>
                  {subtitle ? (
                    <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
                  ) : null}
                  {row.enrichFields && row.enrichFields.length > 0 ? (
                    <p className="text-sm text-[var(--ink-muted)]">
                      Will fill: {row.enrichFields.join(", ")}
                    </p>
                  ) : null}
                  {warning ? (
                    <p className="text-sm text-[var(--ink-muted)]">{warning}</p>
                  ) : null}
                  {row.error ? (
                    <p className="text-sm text-[var(--danger)]">{row.error}</p>
                  ) : null}
                  {row.existingHref ? (
                    <Link
                      href={row.existingHref}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Open existing
                    </Link>
                  ) : null}
                </div>
                {!committed ? (
                  <DecisionToggle
                    runId={run.id}
                    index={row.index}
                    current={row.decision}
                  />
                ) : (
                  <span className="text-xs text-[var(--ink-muted)]">
                    {row.decision}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!committed ? <CommitBar runId={run.id} keepCount={keepCount} /> : null}
    </section>
  );
}
