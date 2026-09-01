"use client";

import { useCallback, useState } from "react";

import {
  buildLessonExport,
  type LessonExportKind,
} from "@/lib/lesson-export";
import type { StudyPack } from "@/lib/transcribe/study-pack";

type LessonExportActionsProps = {
  arabic: string;
  studyPack: StudyPack;
  title: string;
  source?: string | null;
  occurredOn?: string | null;
  textId: string;
  lineStartsMs?: number[] | null;
};

const ACTIONS: Array<{
  kind: LessonExportKind;
  label: string;
  hint: string;
}> = [
  {
    kind: "dialogue",
    label: "Copy dialogue",
    hint: "Markdown transcript with Tutor/You turns",
  },
  {
    kind: "study-pack",
    label: "Copy study pack",
    hint: "Current recall cards, corrections, and threads",
  },
  {
    kind: "ai-review",
    label: "Copy for AI review",
    hint: "Prompt + transcript + candidates for ChatGPT or Claude",
  },
  {
    kind: "corpus-import",
    label: "Copy for import",
    hint: "Dialogue + study hints for Import → Lesson transcript prompt",
  },
];

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function LessonExportActions({
  arabic,
  studyPack,
  title,
  source,
  occurredOn,
  textId,
  lineStartsMs,
}: LessonExportActionsProps) {
  const [copiedKind, setCopiedKind] = useState<LessonExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCopy = useCallback(
    async (kind: LessonExportKind) => {
      setError(null);
      const markdown = buildLessonExport(kind, arabic, studyPack, {
        title,
        source,
        occurredOn,
        textId,
      }, lineStartsMs);
      const ok = await copyText(markdown);
      if (!ok) {
        setError("Could not copy to clipboard.");
        return;
      }
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 2000);
    },
    [arabic, lineStartsMs, occurredOn, source, studyPack, textId, title],
  );

  return (
    <section className="flex flex-col gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <div>
        <h2 className="text-sm text-[var(--ink-muted)]">Export</h2>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Copy markdown for notes, a study plan, or corpus import (vocabulary,
          examples, structures).
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {ACTIONS.map((action) => (
          <button
            key={action.kind}
            type="button"
            title={action.hint}
            className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={() => onCopy(action.kind)}
          >
            {copiedKind === action.kind ? "Copied" : action.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
