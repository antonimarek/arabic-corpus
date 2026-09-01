"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  clearAiStudyPlan,
  saveAiStudyPlan,
} from "@/app/(app)/texts/ai-study-plan-actions";
import { parseAiProduceCold } from "@/lib/ai-study-plan-parse";
import { exampleNewHref } from "@/lib/example-links";

type LessonAiStudyPlanProps = {
  textId: string;
  initialContent: string | null;
};

export function LessonAiStudyPlan({
  textId,
  initialContent,
}: LessonAiStudyPlanProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initialContent);
  const [draft, setDraft] = useState(initialContent ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const produceItems = initialContent && !editing
    ? parseAiProduceCold(initialContent)
    : [];

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveAiStudyPlan(textId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const onClear = () => {
    if (!window.confirm("Remove the saved AI study plan?")) return;
    setError(null);
    startTransition(async () => {
      const result = await clearAiStudyPlan(textId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      setEditing(true);
      router.refresh();
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[var(--ink)]">AI study plan</h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Paste ChatGPT or Claude output after using Copy for AI review.
          </p>
        </div>
        {initialContent && !editing ? (
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className="text-[var(--accent)] hover:underline"
              onClick={() => {
                setDraft(initialContent);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline"
              onClick={onClear}
              disabled={pending}
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={14}
            placeholder="Paste the full markdown response here…"
            className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="min-h-11 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={onSave}
            >
              {pending ? "Saving…" : "Save plan"}
            </button>
            {initialContent ? (
              <button
                type="button"
                className="min-h-11 rounded-md border border-[var(--line)] px-4 py-2 text-sm"
                onClick={() => {
                  setDraft(initialContent);
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--line)] bg-[var(--background)] p-3 text-sm leading-relaxed text-[var(--ink)]">
            {initialContent}
          </div>
          {produceItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-[var(--ink)]">
                Quick add — Produce cold ({produceItems.length})
              </h3>
              <ul className="flex flex-col gap-3">
                {produceItems.map((item) => (
                  <li
                    key={`${item.cueEn}-${item.sayAr}`}
                    className="rounded-md border border-[var(--line)] bg-[var(--background)] p-3"
                  >
                    <p
                      className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
                      lang="ar"
                      dir="rtl"
                    >
                      {item.sayAr}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]" dir="ltr">
                      {item.cueEn}
                    </p>
                    <Link
                      href={exampleNewHref(textId, item.sayAr, {
                        translation: item.cueEn,
                      })}
                      className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline"
                    >
                      Add as example
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
