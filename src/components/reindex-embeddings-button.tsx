"use client";

import { useActionState } from "react";

import {
  reindexEmbeddings,
  type ReindexResult,
} from "@/app/(app)/search/actions";

const initial: ReindexResult = {};

export function ReindexEmbeddingsButton() {
  const [state, action, pending] = useActionState(
    async (_prev: ReindexResult, _formData: FormData) => reindexEmbeddings(),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="self-start text-sm text-[var(--accent)] hover:underline disabled:opacity-60"
      >
        {pending ? "Indexing embeddings…" : "Rebuild semantic index"}
      </button>
      {state.error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      {typeof state.updated === "number" ? (
        <p className="text-xs text-[var(--ink-muted)]">
          Updated {state.updated} embeddings.
        </p>
      ) : null}
    </form>
  );
}
