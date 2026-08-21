"use client";

import { useActionState, useState } from "react";

import { FormSubmit } from "@/components/form-submit";
import { stripJsonFences } from "@/lib/import/bundle";
import {
  IMPORT_ORIGINS,
  IMPORT_VALUES,
  ORIGIN_COPY,
  ORIGIN_DEFAULT_VALUE,
  VALUE_COPY,
  parseImportOrigin,
  parseImportValue,
  type ImportOrigin,
  type ImportValue,
} from "@/lib/import/origin";

import { createImportRun, type ImportFormState } from "./actions";

const initial: ImportFormState = {};

function chipClass(active: boolean): string {
  return `min-h-11 rounded-md px-3 py-2 text-sm ${
    active
      ? "bg-[var(--accent)] text-white"
      : "border border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]"
  }`;
}

function provenanceFromRaw(raw: string): {
  origin: ImportOrigin | null;
  value: ImportValue | null;
} {
  try {
    const parsed = JSON.parse(stripJsonFences(raw)) as {
      source?: { origin?: string; value?: string };
    };
    return {
      origin: parseImportOrigin(parsed.source?.origin),
      value: parseImportValue(parsed.source?.value),
    };
  } catch {
    return { origin: null, value: null };
  }
}

export function ImportIntakeForm() {
  const [state, action, pending] = useActionState(createImportRun, initial);
  const [origin, setOrigin] = useState<ImportOrigin>("lesson");
  const [value, setValue] = useState<ImportValue>("high");
  const [touched, setTouched] = useState(false);

  const pickOrigin = (id: ImportOrigin) => {
    setTouched(true);
    setOrigin(id);
    setValue(ORIGIN_DEFAULT_VALUE[id]);
  };

  const pickValue = (id: ImportValue) => {
    setTouched(true);
    setValue(id);
  };

  const onJsonChange = (raw: string) => {
    if (touched) return;
    const next = provenanceFromRaw(raw);
    if (!next.origin) return;
    setOrigin(next.origin);
    setValue(next.value ?? ORIGIN_DEFAULT_VALUE[next.origin]);
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="origin" value={origin} />
      <input type="hidden" name="value" value={value} />
      <input type="hidden" name="origin_touched" value={touched ? "1" : "0"} />
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Source</span>
        <div className="flex flex-wrap gap-2">
          {IMPORT_ORIGINS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={origin === id}
              onClick={() => pickOrigin(id)}
              className={chipClass(origin === id)}
            >
              {ORIGIN_COPY[id].label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--ink-muted)]">
          {ORIGIN_COPY[origin].hint}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Value</span>
        <div className="flex flex-wrap gap-2">
          {IMPORT_VALUES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              onClick={() => pickValue(id)}
              className={chipClass(value === id)}
            >
              {VALUE_COPY[id].label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--ink-muted)]">
          {VALUE_COPY[value].hint}. Lesson notes stay above generated.
        </span>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Paste JSON</span>
        <textarea
          name="json"
          rows={10}
          spellCheck={false}
          onChange={(event) => onJsonChange(event.target.value)}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--accent)]"
          placeholder='{"version":1,"items":[...]}'
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Or upload a .json file</span>
        <input
          type="file"
          name="file"
          accept="application/json,.json"
          className="text-sm text-[var(--ink)]"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      ) : null}
      <FormSubmit
        pending={pending}
        label="Preview batch"
        pendingLabel="Reading…"
      />
    </form>
  );
}