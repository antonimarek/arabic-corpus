"use client";

import { useActionState } from "react";

import {
  setImportDecision,
  type DecisionFormState,
} from "@/app/(app)/admin/imports/actions";
import type { ReviewDecision } from "@/lib/import/schema";

const initial: DecisionFormState = {};

export function DecisionButtons({
  importRunId,
  stagingId,
  current,
}: {
  importRunId: string;
  stagingId: string;
  current?: ReviewDecision;
}) {
  const action = setImportDecision.bind(null, importRunId, stagingId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {(["keep", "duplicate", "skip"] as const).map((decision) => (
          <form key={decision} action={formAction}>
            <input type="hidden" name="decision" value={decision} />
            <button
              type="submit"
              disabled={pending}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                current === decision
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--accent)]"
              }`}
            >
              {decision === "keep"
                ? "Keep"
                : decision === "duplicate"
                  ? "Duplicate"
                  : "Skip"}
            </button>
          </form>
        ))}
      </div>
      {current ? (
        <p className="text-xs text-[var(--ink-muted)]">Decision: {current}</p>
      ) : null}
      {state.error ? (
        <p className="text-xs text-[var(--danger)]">{state.error}</p>
      ) : null}
    </div>
  );
}
