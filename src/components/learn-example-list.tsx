"use client";

import { useState } from "react";

import { enrollExample } from "@/app/(app)/today/actions";
import type { LearnCandidate } from "@/lib/session-data";

export function LearnExampleList({
  examples,
}: {
  examples: LearnCandidate[];
}) {
  const [enrolled, setEnrolled] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);

  if (examples.length === 0) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        All examples from this text are already in review.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--line)]">
      {examples.map((example) => {
        const done = enrolled.has(example.id);
        return (
          <li
            key={example.id}
            className="flex items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p
                className="font-arabic text-lg text-[var(--ink)]"
                lang="ar"
                dir="rtl"
              >
                {example.arabic}
              </p>
              {example.translation ? (
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {example.translation}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={done}
              className="shrink-0 text-sm text-[var(--accent)] hover:underline disabled:text-[var(--ink-muted)] disabled:no-underline"
              onClick={async () => {
                const result = await enrollExample(example.id);
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setEnrolled((current) => new Set(current).add(example.id));
                setMessage(
                  result.deferred
                    ? "Daily new cap reached. Due tomorrow."
                    : "In review.",
                );
              }}
            >
              {done ? "Added" : "Learn"}
            </button>
          </li>
        );
      })}
      {message ? (
        <li className="pt-2 text-sm text-[var(--ink-muted)]">{message}</li>
      ) : null}
    </ul>
  );
}
