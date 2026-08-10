import Link from "next/link";

type ExampleRow = {
  id: string;
  arabic: string;
  translation?: string | null;
  transliteration?: string | null;
  sourceTitle?: string | null;
  sourceHref?: string | null;
  vocabHints?: string[];
};

export function ExampleList({
  examples,
  emptyMessage = "No linked examples yet.",
}: {
  examples: ExampleRow[];
  emptyMessage?: string;
}) {
  if (examples.length === 0) {
    return (
      <p className="text-[15px] text-[var(--ink-muted)]">{emptyMessage}</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--line)]">
      {examples.map((example) => (
        <li key={example.id} className="py-3.5">
          <Link
            href={`/examples/${example.id}`}
            className="flex flex-col gap-1.5 hover:opacity-80"
          >
            <span
              className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              {example.arabic}
            </span>
            {example.translation ? (
              <span className="text-sm leading-relaxed text-[var(--ink-muted)]">
                {example.translation}
              </span>
            ) : example.transliteration ? (
              <span className="text-sm text-[var(--ink-muted)]">
                {example.transliteration}
              </span>
            ) : null}
            {(example.vocabHints?.length ?? 0) > 0 ? (
              <span className="text-xs text-[var(--ink-muted)]">
                {example.vocabHints!.slice(0, 3).join(" · ")}
              </span>
            ) : null}
          </Link>
          {example.sourceTitle ? (
            example.sourceHref ? (
              <Link
                href={example.sourceHref}
                className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
              >
                {example.sourceTitle}
              </Link>
            ) : (
              <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                from {example.sourceTitle}
              </span>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}
