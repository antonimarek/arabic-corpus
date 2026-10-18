"use client";

import { useEffect, useState } from "react";

import { searchVocabulary } from "@/app/(app)/vocabulary/search-actions";
import {
  PATTERN_ROLE_LABEL,
  PATTERN_ROLES,
} from "@/lib/patterns";
import type { VocabSearchOption } from "@/lib/vocab-search";

const DEBOUNCE_MS = 200;

type PatternLinkVocabProps = {
  patternId: string;
  excludeIds: string[];
  action: (formData: FormData) => void | Promise<void>;
};

export function PatternLinkVocab({
  excludeIds,
  action,
}: PatternLinkVocabProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<VocabSearchOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const exclude = new Set(excludeIds);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    void searchVocabulary(debounced, 20).then((result) => {
      if (cancelled) return;
      setSearching(false);
      if (result.error) {
        setSearchError(result.error);
        setOptions([]);
        return;
      }
      setOptions(result.options.filter((option) => !exclude.has(option.id)));
    });
    return () => {
      cancelled = true;
    };
    // excludeIds serialized — avoid Set identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, excludeIds.join(",")]);

  const selected = options.find((option) => option.id === selectedId);

  return (
    <form action={action} className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-4">
      <h3 className="text-sm text-[var(--ink-muted)]">Link a word</h3>
      <input type="hidden" name="vocabulary_id" value={selectedId} required />
      <label className="flex flex-col gap-2">
        <span className="sr-only">Search word</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
          }}
          placeholder="Search vocabulary…"
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {searchError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {searchError}
        </p>
      ) : searching ? (
        <p className="text-sm text-[var(--ink-muted)]">Searching…</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No matches.</p>
      ) : (
        <ul className="max-h-40 overflow-y-auto rounded-md border border-[var(--line)]">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(option.id);
                  setQuery(option.arabic);
                }}
                className={`flex w-full flex-col items-start px-3 py-2 text-start hover:bg-[var(--surface-hover)] ${
                  selectedId === option.id ? "bg-[var(--surface-hover)]" : ""
                }`}
              >
                <span
                  className="font-arabic text-base text-[var(--ink)]"
                  lang="ar"
                  dir="rtl"
                >
                  {option.arabic}
                </span>
                {option.hint ? (
                  <span className="text-xs text-[var(--ink-muted)]">
                    {option.hint}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <p className="text-xs text-[var(--ink-muted)]">
          Selected:{" "}
          <span className="font-arabic text-[var(--ink)]" lang="ar" dir="rtl">
            {selected.arabic}
          </span>
        </p>
      ) : null}
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Role</span>
        <select
          name="role"
          defaultValue="derived"
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        >
          {PATTERN_ROLES.map((role) => (
            <option key={role} value={role}>
              {PATTERN_ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={!selectedId}
        className="self-start text-sm text-[var(--accent)] hover:underline disabled:opacity-40"
      >
        Link word
      </button>
    </form>
  );
}
