"use client";

import { useActionState } from "react";

import { FormSubmit } from "@/components/form-submit";

import { commitImportRun, discardImportRun, type ImportFormState } from "./actions";

const initial: ImportFormState = {};

export function CommitBar({
  runId,
  keepCount,
}: {
  runId: string;
  keepCount: number;
}) {
  const action = commitImportRun.bind(null, runId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction}>
        <FormSubmit
          pending={pending}
          label={`Commit ${keepCount} kept item${keepCount === 1 ? "" : "s"}`}
          pendingLabel="Writing…"
        />
      </form>
      {state.error ? (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      ) : null}
      <form action={discardImportRun.bind(null, runId)}>
        <button
          type="submit"
          className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          Discard run
        </button>
      </form>
    </div>
  );
}
