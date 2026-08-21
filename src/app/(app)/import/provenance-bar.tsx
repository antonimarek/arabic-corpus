"use client";

import { useActionState } from "react";

import {
  IMPORT_ORIGINS,
  IMPORT_VALUES,
  ORIGIN_COPY,
  ORIGIN_DEFAULT_VALUE,
  VALUE_COPY,
  type ImportOrigin,
  type ImportValue,
} from "@/lib/import/origin";

import { setImportProvenance, type ImportFormState } from "./actions";

const initial: ImportFormState = {};

function chipClass(active: boolean): string {
  return `min-h-11 rounded-md px-3 py-2 text-sm ${
    active
      ? "bg-[var(--accent)] text-white"
      : "border border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]"
  }`;
}

export function ProvenanceBar({
  runId,
  origin,
  value,
}: {
  runId: string;
  origin: ImportOrigin;
  value: ImportValue;
}) {
  const action = setImportProvenance.bind(null, runId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--line)] p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--ink)]">Source</p>
        <div className="flex flex-wrap gap-2">
          {IMPORT_ORIGINS.map((id) => (
            <form key={id} action={formAction}>
              <input type="hidden" name="origin" value={id} />
              <input
                type="hidden"
                name="value"
                value={id === origin ? value : ORIGIN_DEFAULT_VALUE[id]}
              />
              <button
                type="submit"
                disabled={pending}
                aria-pressed={origin === id}
                className={chipClass(origin === id)}
              >
                {ORIGIN_COPY[id].label}
              </button>
            </form>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {ORIGIN_COPY[origin].hint}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--ink)]">Value</p>
        <div className="flex flex-wrap gap-2">
          {IMPORT_VALUES.map((id) => (
            <form key={id} action={formAction}>
              <input type="hidden" name="origin" value={origin} />
              <input type="hidden" name="value" value={id} />
              <button
                type="submit"
                disabled={pending}
                aria-pressed={value === id}
                className={chipClass(value === id)}
              >
                {VALUE_COPY[id].label}
              </button>
            </form>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {VALUE_COPY[value].hint}. Lesson notes stay above generated.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      ) : null}
    </div>
  );
}