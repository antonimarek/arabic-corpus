"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createPattern,
  updatePattern,
  type PatternFormState,
} from "@/app/(app)/patterns/actions";
import { FormSubmit } from "@/components/form-submit";
import { optionMatchesQuery } from "@/lib/option-filter";
import {
  MASTERY_LABEL,
  MASTERY_STATES,
  type PatternPair,
  type VocabOption,
} from "@/lib/patterns";
import type { MorphPattern } from "@/types/database";

const initialState: PatternFormState = {};
const MAX_PAIRS = 5;

type PairRow = {
  key: string;
  baseId: string;
  derivedId: string;
};

type PatternFormProps =
  | {
      mode: "create";
      vocabOptions: VocabOption[];
      siblingOptions?: VocabOption[];
      seedVocabularyId?: string;
      seedArabic?: string;
      initialPairs?: PatternPair[];
      suggestionId?: string;
      defaults?: {
        name?: string;
        arabic_sketch?: string | null;
        form_label?: string | null;
        cue?: string | null;
        meaning_shift?: string | null;
      };
    }
  | {
      mode: "edit";
      pattern: MorphPattern;
      vocabOptions: VocabOption[];
      initialPairs?: PatternPair[];
    };

function newPairRow(baseId = "", derivedId = ""): PairRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    baseId,
    derivedId,
  };
}

function VocabSelect({
  name,
  value,
  onChange,
  options,
  preferredIds,
  placeholder,
  excludeId,
}: {
  name: string;
  value: string;
  onChange: (id: string) => void;
  options: VocabOption[];
  preferredIds?: Set<string>;
  placeholder: string;
  excludeId?: string;
}) {
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => {
    const filtered = options.filter((option) => option.id !== excludeId);
    const preferred = preferredIds
      ? filtered.filter((option) => preferredIds.has(option.id))
      : [];
    const rest = preferredIds
      ? filtered.filter((option) => !preferredIds.has(option.id))
      : filtered;
    const pool = [...preferred, ...rest];
    if (!query.trim()) return pool.slice(0, 80);
    return pool
      .filter((option) =>
        optionMatchesQuery(
          { label: option.arabic, hint: option.hint },
          query,
        ),
      )
      .slice(0, 80);
  }, [excludeId, options, preferredIds, query]);

  const selected = options.find((option) => option.id === value);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <input type="hidden" name={name} value={value} />
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
          <span
            className="font-arabic min-w-0 truncate text-lg text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {selected.arabic}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-xs text-[var(--ink-muted)] hover:underline"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <ul className="max-h-36 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)]">
            {ordered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--ink-muted)]">
                No matches.
              </li>
            ) : (
              ordered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setQuery("");
                    }}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-[var(--surface-hover)]"
                  >
                    <span
                      className="font-arabic text-lg text-[var(--ink)]"
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
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export function PatternForm(props: PatternFormProps) {
  const action =
    props.mode === "create"
      ? createPattern
      : updatePattern.bind(null, props.pattern.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const pattern = props.mode === "edit" ? props.pattern : null;
  const createDefaults =
    props.mode === "create" ? (props.defaults ?? {}) : {};
  const suggestionId =
    props.mode === "create" ? props.suggestionId : undefined;
  const vocabOptions = props.vocabOptions;
  const siblingOptions =
    props.mode === "create" ? (props.siblingOptions ?? []) : [];
  const preferredIds = useMemo(
    () => new Set(siblingOptions.map((option) => option.id)),
    [siblingOptions],
  );

  const [pairs, setPairs] = useState<PairRow[]>(() => {
    const initial = props.initialPairs ?? [];
    if (initial.length > 0) {
      return initial.map((pair) => newPairRow(pair.baseId, pair.derivedId));
    }
    if (props.mode === "create" && props.seedVocabularyId) {
      return [newPairRow("", props.seedVocabularyId)];
    }
    return [newPairRow()];
  });

  function setPairField(
    key: string,
    field: "baseId" | "derivedId",
    value: string,
  ) {
    setPairs((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function fillBaseFromSibling(siblingId: string) {
    setPairs((rows) => {
      if (rows.length === 0) return [newPairRow(siblingId, "")];
      const [first, ...rest] = rows;
      return [{ ...first, baseId: siblingId }, ...rest];
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {suggestionId ? (
        <input type="hidden" name="suggestion_id" value={suggestionId} />
      ) : null}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-[var(--ink)]">Examples</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Connect words you already know. A pattern is a move you can spot
            across them.
          </p>
        </div>

        {props.mode === "create" && props.seedArabic ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Starting from{" "}
            <span className="font-arabic text-[var(--ink)]" lang="ar" dir="rtl">
              {props.seedArabic}
            </span>{" "}
            (derived). Pick a base word it comes from.
          </p>
        ) : null}

        {siblingOptions.length > 0 && !pairs[0]?.baseId ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--ink-muted)]">
              Same-root siblings — tap to use as base
            </p>
            <ul className="flex flex-wrap gap-2">
              {siblingOptions.map((sibling) => (
                <li key={sibling.id}>
                  <button
                    type="button"
                    onClick={() => fillBaseFromSibling(sibling.id)}
                    className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                  >
                    <span
                      className="font-arabic text-base"
                      lang="ar"
                      dir="rtl"
                    >
                      {sibling.arabic}
                    </span>
                    {sibling.hint ? (
                      <span className="ms-2 text-xs text-[var(--ink-muted)]">
                        {sibling.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="flex flex-col gap-4">
          {pairs.map((row) => (
            <li
              key={row.key}
              className="flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <VocabSelect
                name="pair_base"
                value={row.baseId}
                onChange={(id) => setPairField(row.key, "baseId", id)}
                options={vocabOptions}
                preferredIds={preferredIds}
                placeholder="Base word…"
                excludeId={row.derivedId || undefined}
              />
              <span
                className="hidden shrink-0 pt-3 text-[var(--ink-muted)] sm:inline"
                aria-hidden
              >
                →
              </span>
              <span className="text-center text-sm text-[var(--ink-muted)] sm:hidden">
                →
              </span>
              <VocabSelect
                name="pair_derived"
                value={row.derivedId}
                onChange={(id) => setPairField(row.key, "derivedId", id)}
                options={vocabOptions}
                preferredIds={preferredIds}
                placeholder="Derived word…"
                excludeId={row.baseId || undefined}
              />
              {pairs.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setPairs((rows) => rows.filter((r) => r.key !== row.key))
                  }
                  className="self-start text-xs text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline sm:pt-3"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {pairs.length < MAX_PAIRS ? (
          <button
            type="button"
            onClick={() => setPairs((rows) => [...rows, newPairRow()])}
            className="self-start text-sm text-[var(--accent)] hover:underline"
          >
            + Add another example
          </button>
        ) : null}
      </section>

      <section className="flex flex-col gap-5 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-medium text-[var(--ink)]">Pattern</h2>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Name</span>
          <input
            name="name"
            required
            defaultValue={pattern?.name ?? createDefaults.name ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="Double middle"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Transformation</span>
          <input
            name="arabic_sketch"
            dir="rtl"
            lang="ar"
            defaultValue={
              pattern?.arabic_sketch ?? createDefaults.arabic_sketch ?? ""
            }
            className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xl outline-none focus:border-[var(--accent)]"
            placeholder="فَعَل → فَعَّل"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Form (optional)</span>
          <input
            name="form_label"
            defaultValue={
              pattern?.form_label ?? createDefaults.form_label ?? ""
            }
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="II"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Cue</span>
          <input
            name="cue"
            defaultValue={pattern?.cue ?? createDefaults.cue ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="Shadda on the middle consonant"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            Typical meaning / effect
          </span>
          <textarea
            name="meaning_shift"
            rows={3}
            defaultValue={
              pattern?.meaning_shift ?? createDefaults.meaning_shift ?? ""
            }
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-[var(--accent)]"
            placeholder="Often causes, intensifies, or changes who the action affects."
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Notes</span>
          <textarea
            name="notes"
            rows={3}
            defaultValue={pattern?.notes ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="Levantine quirks, MSA traps…"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Mastery</span>
          <select
            name="mastery_state"
            defaultValue={pattern?.mastery_state ?? "encountered"}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          >
            {MASTERY_STATES.map((state) => (
              <option key={state} value={state}>
                {MASTERY_LABEL[state]}
              </option>
            ))}
          </select>
        </label>
      </section>

      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <FormSubmit
        pending={pending}
        label={props.mode === "create" ? "Save pattern" : "Save changes"}
      />
    </form>
  );
}
