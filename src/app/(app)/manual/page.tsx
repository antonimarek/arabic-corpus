import Link from "next/link";

import { MANUAL_LAYERS, MANUAL_MODULES } from "@/lib/manual";

export default function ManualPage() {
  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">Manual</h1>
        <p className="text-[15px] text-[var(--ink-muted)]">
          How this corpus app fits together. Use Today as the daily habit.
          Everything else feeds that.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">Layers</h2>
        <ul className="flex flex-col gap-3">
          {MANUAL_LAYERS.map((layer) => (
            <li key={layer.title} className="flex flex-col gap-1">
              <p className="font-medium text-[var(--ink)]">{layer.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">{layer.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">Modules</h2>
        <ul className="flex flex-col gap-4">
          {MANUAL_MODULES.map((module) => (
            <li key={module.id} className="flex flex-col gap-1">
              {module.href ? (
                <Link
                  href={module.href}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {module.title}
                </Link>
              ) : (
                <p className="font-medium text-[var(--ink)]">{module.title}</p>
              )}
              <p className="text-sm text-[var(--ink-muted)]">{module.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-[var(--line)] p-4">
        <h2 className="font-medium text-[var(--ink)]">Discover patterns</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Batch script finds middle-doubling <em>relationships</em> in your
          vocabulary (both sides of a pair must exist). It suggests a pattern
          only when at least two independent pairs share the same move. Review
          under Patterns → Suggestions.
        </p>
        <pre className="overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)]">
          {`npm run discover:patterns -- --owner-email you@example.com
npm run discover:patterns -- --owner-id <uuid> --dry-run`}
        </pre>
        <Link
          href="/patterns/suggestions"
          className="self-start text-sm text-[var(--accent)] hover:underline"
        >
          Open Suggestions
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-[var(--line)] p-4">
        <h2 className="font-medium text-[var(--ink)]">Sources playbook</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          What goes in the corpus, what stays in your ears, and how to use
          Shwayy.
        </p>
        <Link
          href="/manual/sources"
          className="self-start text-sm text-[var(--accent)] hover:underline"
        >
          Open Sources
        </Link>
      </div>
    </section>
  );
}
