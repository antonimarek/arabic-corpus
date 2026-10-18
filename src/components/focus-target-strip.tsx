"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  addTextFocus,
  removeTextFocus,
  searchVocabularyForFocus,
} from "@/app/(app)/texts/actions";
import type { FocusTarget, VocabOption } from "@/lib/text-detail";
import { textQueryKey } from "@/lib/text-detail";

type FocusTargetStripProps = {
  textId: string;
  focus: FocusTarget[];
};

const DEBOUNCE_MS = 200;

export function FocusTargetStrip({ textId, focus }: FocusTargetStripProps) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<VocabOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const focusIds = useMemo(() => new Set(focus.map((row) => row.id)), [focus]);

  useEffect(() => {
    if (!adding) return;
    const handle = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [adding, query]);

  useEffect(() => {
    if (!adding) return;
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    void searchVocabularyForFocus(debounced).then((result) => {
      if (cancelled) return;
      setSearching(false);
      if (result.error) {
        setSearchError(result.error);
        setOptions([]);
        return;
      }
      setOptions(result.options.filter((option) => !focusIds.has(option.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [adding, debounced, focusIds]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: textQueryKey(textId) });
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm text-[var(--ink-muted)]">
          Focus ({focus.length})
        </h2>
        <button
          type="button"
          className="text-sm text-[var(--accent)] hover:underline"
          onClick={() => {
            setAdding((open) => !open);
            setQuery("");
            setDebounced("");
            setSearchError(null);
          }}
          aria-expanded={adding}
        >
          {adding ? "Done" : "Add target"}
        </button>
      </div>
      {focus.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Words this text is for. Add a few before you read.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {focus.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3"
            >
              <Link href={`/vocabulary/${row.id}`} className="min-w-0">
                <span
                  className="font-arabic text-lg text-[var(--ink)] hover:underline"
                  lang="ar"
                  dir="rtl"
                >
                  {row.arabic}
                </span>
                {row.gloss ? (
                  <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                    {row.gloss}
                  </span>
                ) : null}
              </Link>
              <form
                action={async () => {
                  await removeTextFocus(textId, row.id);
                  refresh();
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="flex flex-col gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vocabulary…"
            className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          {searchError ? (
            <p className="px-1 py-2 text-sm text-[var(--danger)]" role="alert">
              {searchError}
            </p>
          ) : searching ? (
            <p className="px-1 py-2 text-sm text-[var(--ink-muted)]">
              Searching…
            </p>
          ) : options.length === 0 ? (
            <p className="px-1 py-2 text-sm text-[var(--ink-muted)]">
              No matches.
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto">
              {options.map((option) => (
                <li key={option.id}>
                  <form
                    action={async () => {
                      await addTextFocus(textId, option.id);
                      refresh();
                    }}
                  >
                    <button
                      type="submit"
                      className="flex w-full flex-col items-start px-2 py-2 text-start hover:bg-[var(--surface-hover)]"
                    >
                      <span
                        className="font-arabic text-base text-[var(--ink)]"
                        lang="ar"
                        dir="rtl"
                      >
                        {option.arabic}
                      </span>
                      {option.gloss ? (
                        <span className="text-xs text-[var(--ink-muted)]">
                          {option.gloss}
                        </span>
                      ) : null}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
