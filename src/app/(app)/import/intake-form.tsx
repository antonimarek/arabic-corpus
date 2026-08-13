"use client";

import { useActionState } from "react";

import { FormSubmit } from "@/components/form-submit";

import { createImportRun, type ImportFormState } from "./actions";

const initial: ImportFormState = {};

export function ImportIntakeForm() {
  const [state, action, pending] = useActionState(createImportRun, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Paste JSON</span>
        <textarea
          name="json"
          rows={10}
          spellCheck={false}
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
