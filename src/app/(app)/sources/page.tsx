import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  SOURCE_ENTRIES,
  SOURCE_JOB_COPY,
  SOURCE_JOBS,
  SOURCE_OBJECTS,
  WEEKLY_STEPS,
  type SourceEntry,
  type SourceJob,
} from "@/lib/sources";

function JobPill({ job }: { job: SourceJob }) {
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-[var(--ink-muted)] ring-1 ring-[var(--line)]">
      {SOURCE_JOB_COPY[job].label}
    </span>
  );
}

function SourceCard({
  entry,
  inCorpus,
}: {
  entry: SourceEntry;
  inCorpus: number;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-md border border-[var(--line)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium text-[var(--ink)]">{entry.name}</h3>
        <JobPill job={entry.job} />
      </div>
      <p className="text-sm text-[var(--ink-muted)]">{entry.city}</p>
      {entry.owned ? (
        <p className="text-sm text-[var(--ink)]">
          You own this.
          {inCorpus > 0
            ? ` ${inCorpus} text${inCorpus === 1 ? "" : "s"} in the corpus.`
            : " Not in the corpus yet."}
        </p>
      ) : null}
      <p className="text-[15px] text-[var(--ink)]">{entry.use}</p>
      <p className="text-sm text-[var(--ink-muted)]">Skip: {entry.skip}</p>
      <p className="text-sm text-[var(--ink)]">How: {entry.how}</p>
    </article>
  );
}

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data: shwayyRows } = await supabase
    .from("texts")
    .select("id")
    .like("source", "shwayy-an-haali%");
  const shwayyCount = shwayyRows?.length ?? 0;

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">Sources</h1>
        <p className="text-[15px] text-[var(--ink-muted)]">
          What goes in the corpus, and what stays in your ears.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">
          Three jobs
        </h2>
        <ul className="flex flex-col gap-3">
          {SOURCE_OBJECTS.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <p className="font-medium text-[var(--ink)]">{item.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">This week</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[var(--ink)]">
          {WEEKLY_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {SOURCE_JOBS.map((job) => (
        <div key={job} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-[var(--ink-muted)]">
              {SOURCE_JOB_COPY[job].label}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {SOURCE_JOB_COPY[job].blurb}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {SOURCE_ENTRIES.filter((entry) => entry.job === job).map((entry) => (
              <SourceCard
                key={entry.id}
                entry={entry}
                inCorpus={entry.id === "shwayy" ? shwayyCount : 0}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 rounded-md border border-[var(--line)] p-4">
        <h2 className="font-medium text-[var(--ink)]">Import Shwayy</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--ink)]">
          <li>
            Parse the PDF on your machine. Output lands in gitignored{" "}
            <code className="text-xs">raw/</code>.
          </li>
          <li>
            Upload the JSON on{" "}
            <Link href="/import" className="text-[var(--accent)] hover:underline">
              Import
            </Link>
            . Keep the 30 texts. Do not import the glossary.
          </li>
          <li>
            Attach one MP3 per section on the text. Today only picks texts with
            audio.
          </li>
        </ol>
        <pre className="overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)]">
          {`npx tsx import/scripts/parse-shwayy.ts --pdf /path/to/Shwayy-An-Haali.pdf --out raw/shwayy-an-haali.json`}
        </pre>
      </div>
    </section>
  );
}
