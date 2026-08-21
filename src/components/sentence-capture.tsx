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
          className="ui-input font-arabic py-3 text-xl leading-relaxed"
        />
      </label>
      {showTranslation ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[var(--ink-muted)]">Translation</span>
          <textarea
            name="translation"
            rows={2}
            className="ui-input"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowTranslation(true)}
          className="self-start text-sm text-[var(--ink-muted)] hover:text-[var(--accent)]"
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
        className="ui-btn-primary self-start"
      >
        {pending ? "Saving…" : "Save sentence"}
      </button>
    </form>
  );
}
