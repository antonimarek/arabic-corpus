import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionButtons } from "@/app/(app)/admin/imports/decision-buttons";
import { createFilesystemStagingStore } from "@/lib/import/staging";
import { requireUserId } from "@/lib/require-user";

type Props = {
  params: Promise<{ runId: string }>;
};

export default async function AdminImportRunPage({ params }: Props) {
  await requireUserId();
  const { runId } = await params;
  const store = createFilesystemStagingStore();
  const meta = await store.getRun(runId);
  if (!meta) {
    notFound();
  }

  const candidates = await store.getCandidates(runId);
  const decisions = await store.getDecisions(runId);
  const byId = new Map(candidates.map((c) => [c.stagingId, c]));

  const possible = candidates.filter(
    (c) => c.match.status === "POSSIBLE_DUPLICATE",
  );

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--ink-muted)]">
          <Link href="/admin/imports" className="text-[var(--accent)] hover:underline">
            Local imports
          </Link>
        </p>
        <h1 className="text-xl font-medium text-[var(--ink)]">
          {meta.sourceFile}
        </h1>
        <p className="text-xs text-[var(--ink-muted)]">
          {meta.importRunId} · {meta.sourceType} · hash {meta.fileHash.slice(0, 12)}…
        </p>
        <p className="text-sm text-[var(--ink-muted)]">
          NEW {meta.recordCounts.NEW} · EXACT_DUPLICATE{" "}
          {meta.recordCounts.EXACT_DUPLICATE} · POSSIBLE_DUPLICATE{" "}
          {meta.recordCounts.POSSIBLE_DUPLICATE} · MATCH_EXISTING{" "}
          {meta.recordCounts.MATCH_EXISTING} · errors {meta.errors.length}
        </p>
      </header>

      {meta.errors.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-[var(--ink-muted)]">Parse errors</h2>
          <ul className="text-sm text-[var(--danger)]">
            {meta.errors.map((err, i) => (
              <li key={`${err.row}-${i}`}>
                Row {err.row ?? "?"}: {err.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {possible.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Possible duplicates ({possible.length})
          </h2>
          {possible.map((cand) => {
            const relatedId = cand.match.relatedStagingIds?.[0];
            const related = relatedId ? byId.get(relatedId) : undefined;
            return (
              <div
                key={cand.stagingId}
                className="grid gap-4 border border-[var(--line)] p-4 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[var(--ink-muted)]">Incoming</p>
                  <p
                    className="font-arabic text-xl"
                    lang="ar"
                    dir="rtl"
                  >
                    {cand.original.arabic}
                  </p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {cand.glosses.map((g) => g.text).join(" · ")}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {cand.sources
                      .map((s) => `${s.file}${s.row ? ` row ${s.row}` : ""}`)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    score {cand.match.score?.toFixed(3) ?? "—"} ·{" "}
                    {cand.extraction.method}
                    {cand.extraction.needsReview ? " · needs review" : ""}
                  </p>
                  <DecisionButtons
                    importRunId={runId}
                    stagingId={cand.stagingId}
                    current={decisions?.decisions[cand.stagingId]?.decision}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[var(--ink-muted)]">
                    Existing / candidate
                  </p>
                  {related ? (
                    <>
                      <p
                        className="font-arabic text-xl"
                        lang="ar"
                        dir="rtl"
                      >
                        {related.original.arabic}
                      </p>
                      <p className="text-sm text-[var(--ink-muted)]">
                        {related.glosses.map((g) => g.text).join(" · ")}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {related.sources
                          .map(
                            (s) =>
                              `${s.file}${s.row ? ` row ${s.row}` : ""}`,
                          )
                          .join(" · ")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--ink-muted)]">
                      Related staging id: {relatedId ?? "—"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-[var(--ink-muted)]">
          All candidates ({candidates.length})
        </h2>
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {candidates.map((cand) => (
            <li key={cand.stagingId} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  {cand.match.status} · {cand.entityHint}
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  {cand.extraction.method}
                  {cand.extraction.needsReview ? " · review" : ""}
                </span>
              </div>
              <p className="font-arabic text-lg" lang="ar" dir="rtl">
                {cand.original.arabic ?? "(no arabic)"}
              </p>
              <p className="text-sm text-[var(--ink-muted)]">
                {cand.glosses.map((g) => g.text).join(" · ") || "—"}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {cand.sources
                  .map((s) => `${s.type}:${s.file}`)
                  .join(" · ")}
              </p>
              <DecisionButtons
                importRunId={runId}
                stagingId={cand.stagingId}
                current={decisions?.decisions[cand.stagingId]?.decision}
              />
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
