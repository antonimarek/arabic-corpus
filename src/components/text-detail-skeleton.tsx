import type { TextShell } from "@/lib/text-detail";

export function TextDetailSkeleton({ shell }: { shell: TextShell }) {
  return (
    <article className="flex flex-col gap-8" aria-busy="true">
      <header className="flex flex-col gap-3">
        <h1 className="text-xl font-medium text-[var(--ink)]">{shell.title}</h1>
        <p className="text-xs text-[var(--ink-muted)]">
          {[shell.source, shell.occurred_on, ...shell.tags]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-[var(--surface)]" />
        <div className="h-10 rounded bg-[var(--surface)]" />
      </div>

      <div
        className="font-arabic line-clamp-6 text-lg leading-relaxed text-[var(--ink-muted)]"
        lang="ar"
        dir="rtl"
      >
        {shell.arabic}
      </div>

      <p className="text-sm text-[var(--ink-muted)]">Loading text…</p>
    </article>
  );
}
