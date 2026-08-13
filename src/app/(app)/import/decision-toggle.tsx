"use client";

import { useActionState } from "react";

import { setImportRowDecision, type ImportFormState } from "./actions";

const initial: ImportFormState = {};

export function DecisionToggle({
  runId,
  index,
  current,
}: {
  runId: string;
  index: number;
  current: "keep" | "skip";
}) {
  const action = setImportRowDecision.bind(null, runId, index);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {(["keep", "skip"] as const).map((decision) => (
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
              {decision === "keep" ? "Keep" : "Skip"}
            </button>
          </form>
        ))}
      </div>
      {state.error ? (
        <p className="text-xs text-[var(--danger)]">{state.error}</p>
      ) : null}
    </div>
  );
}
