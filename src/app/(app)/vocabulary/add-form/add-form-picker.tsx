"use client";

import { useMemo, useState } from "react";

import { attachVocabularyForm } from "@/app/(app)/vocabulary/actions";
import { optionMatchesQuery } from "@/lib/option-filter";

type Option = {
  id: string;
  arabic: string;
  hint: string;
};

export function AddFormPicker({
  arabic,
  options,
}: {
  arabic: string;
  options: Option[];
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      options.filter((option) =>
        optionMatchesQuery({ label: option.arabic, hint: option.hint }, query),
      ),
    [options, query],
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter vocabulary…"
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      {visible.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No matches.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {visible.map((option) => (
            <li key={option.id} className="py-3">
              <form
                action={attachVocabularyForm.bind(null, option.id)}
                className="flex items-center justify-between gap-3"
              >
                <input type="hidden" name="arabic" value={arabic} />
                <div className="min-w-0">
                  <p
                    className="font-arabic text-lg text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {option.arabic}
                  </p>
                  {option.hint ? (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {option.hint}
                    </p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="shrink-0 text-sm text-[var(--accent)] hover:underline"
                >
                  Use this word
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
