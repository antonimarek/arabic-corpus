import Link from "next/link";
import type { ReactNode } from "react";

import { timestampLineHref } from "@/lib/study-pack-nav";
import type { StudyPack } from "@/lib/transcribe/study-pack";

type LessonStudyPackProps = {
  textId: string;
  studyPack: StudyPack;
  lineStartsMs: number[] | null;
};

function TimestampLink({
  textId,
  label,
  lineStartsMs,
}: {
  textId: string;
  label: string;
  lineStartsMs: number[] | null;
}) {
  const href = timestampLineHref(textId, label, lineStartsMs);
  const display = label.replace(/[\[\]]/g, "");

  if (!href) {
    return (
      <span className="font-mono text-xs text-[var(--ink-muted)]">[{display}]</span>
    );
  }

  return (
    <Link
      href={href}
      className="font-mono text-xs text-[var(--accent)] hover:underline"
    >
      [{display}]
    </Link>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-[var(--ink)]">{children}</h3>
  );
}

export function LessonStudyPack({
  textId,
  studyPack,
  lineStartsMs,
}: LessonStudyPackProps) {
  return (
    <section className="flex flex-col gap-6 border-t border-[var(--line)] pt-6">
      <div>
        <h2 className="text-sm text-[var(--ink-muted)]">Study pack</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Weekly practice from this lesson. Tap timestamps to jump in the
          dialogue.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading>This week</SectionHeading>
        <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink-muted)]">
          {studyPack.weeklyPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Active recall phrases ({studyPack.recallPhrases.length})
        </SectionHeading>
        {studyPack.recallPhrases.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No phrases extracted automatically.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {studyPack.recallPhrases.map((item) => (
              <li
                key={`${item.timestamp}-${item.arabic}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="mb-2">
                  <TimestampLink
                    textId={textId}
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                  />
                </div>
                <p
                  className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {item.arabic}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {item.context}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Confusion moments ({studyPack.confusionMoments.length})
        </SectionHeading>
        {studyPack.confusionMoments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            None auto-detected.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {studyPack.confusionMoments.map((item) => (
              <li
                key={`${item.timestamp}-${item.student.slice(0, 40)}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="mb-2">
                  <TimestampLink
                    textId={textId}
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                  />
                </div>
                <p className="text-sm text-[var(--ink-muted)]">
                  <span className="text-[var(--ink)]">You:</span> {item.student}
                </p>
                {item.tutor ? (
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">
                    <span className="text-[var(--ink)]">Tutor:</span>{" "}
                    {item.tutor}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Grammar threads ({studyPack.grammarThreads.length})
        </SectionHeading>
        {studyPack.grammarThreads.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            None auto-detected.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {studyPack.grammarThreads.map((thread) => (
              <li
                key={thread.topic}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <p className="text-sm font-medium text-[var(--ink)]">
                  {thread.topic}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {thread.timestamps.map((label) => (
                    <TimestampLink
                      key={label}
                      textId={textId}
                      label={label}
                      lineStartsMs={lineStartsMs}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {thread.sample}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
