import Link from "next/link";

type ExampleRow = {
  id: string;
  arabic: string;
  translation?: string | null;
  transliteration?: string | null;
  sourceTitle?: string | null;
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
        <li key={example.id}>
          <Link
            href={`/examples/${example.id}`}
            className="flex flex-col gap-1.5 py-3.5 hover:opacity-80"
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
            {(example.sourceTitle || (example.vocabHints?.length ?? 0) > 0) && (
              <span className="text-xs text-[var(--ink-muted)]">
                {[
                  example.sourceTitle ? `from ${example.sourceTitle}` : null,
                  example.vocabHints && example.vocabHints.length > 0
                    ? example.vocabHints.slice(0, 3).join(" · ")
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
