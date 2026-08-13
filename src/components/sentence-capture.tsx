"use client";

import { useActionState, useState } from "react";

import {
  createExample,
  type ExampleFormState,
} from "@/app/(app)/examples/actions";

const initialState: ExampleFormState = {};

export function SentenceCapture() {
  const [state, formAction, pending] = useActionState(
    createExample,
    initialState,
  );
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-[var(--ink-muted)]">
        Save a sentence
      </h2>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Arabic sentence</span>
        <textarea
          name="arabic"
          required
          rows={2}
          dir="rtl"
          lang="ar"
          placeholder="الصق جملة…"
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xl leading-relaxed outline-none focus:border-[var(--accent)]"
        />
      </label>
      {showTranslation ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[var(--ink-muted)]">Translation</span>
          <textarea
            name="translation"
            rows={2}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowTranslation(true)}
          className="self-start text-sm text-[var(--accent)] hover:underline"
        >
          Add translation
        </button>
      )}
      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save sentence"}
      </button>
    </form>
  );
}
