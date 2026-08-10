import Link from "next/link";

import { createFilesystemStagingStore } from "@/lib/import/staging";
import { requireUserId } from "@/lib/require-user";

export default async function AdminImportsPage() {
  await requireUserId();
  const store = createFilesystemStagingStore();
  const runs = await store.listRuns();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">
          Local import review
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Dev tool for filesystem staging under{" "}
          <code className="text-xs">import/staging</code>. Not a production
          feature. Deployed hosts have no local staging files.
        </p>
      </header>

      {runs.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">
          No import runs yet. Run{" "}
          <code className="text-xs">npm run import -- …</code> locally.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {runs.map((run) => (
            <li key={run.importRunId} className="py-4">
              <Link
                href={`/admin/imports/${run.importRunId}`}
                className="flex flex-col gap-1 hover:opacity-80"
              >
                <span className="font-medium text-[var(--ink)]">
                  {run.sourceFile}
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  {run.importRunId} · {run.sourceType} · {run.status} ·{" "}
                  {run.startedAt}
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  NEW {run.recordCounts.NEW} · EXACT{" "}
                  {run.recordCounts.EXACT_DUPLICATE} · POSSIBLE{" "}
                  {run.recordCounts.POSSIBLE_DUPLICATE} · MATCH{" "}
                  {run.recordCounts.MATCH_EXISTING} · ERR{" "}
                  {run.recordCounts.ERROR}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
