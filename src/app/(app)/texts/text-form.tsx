"use client";

import { useActionState, useRef, useState } from "react";

import {
  createText,
  updateText,
  type TextFormState,
} from "@/app/(app)/texts/actions";
import { FormSubmit } from "@/components/form-submit";
import { TagField } from "@/components/tag-field";
import {
  breakTextIntoSentenceLines,
  shouldOfferSentenceSplit,
} from "@/lib/text-lines";
import type { Text } from "@/types/database";

const initialState: TextFormState = {};

type TextFormProps =
  | { mode: "create" }
  | { mode: "edit"; text: Text; tagsInput: string };

export function TextForm(props: TextFormProps) {
  const action =
    props.mode === "create"
      ? createText
      : updateText.bind(null, props.text.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const text = props.mode === "edit" ? props.text : null;
  const arabicRef = useRef<HTMLTextAreaElement>(null);
  const [canSplit, setCanSplit] = useState(() =>
    shouldOfferSentenceSplit(text?.arabic ?? ""),
  );

  const refreshSplitOffer = () => {
    setCanSplit(shouldOfferSentenceSplit(arabicRef.current?.value ?? ""));
  };

  const splitIntoLines = () => {
    const el = arabicRef.current;
    if (!el) return;
    el.value = breakTextIntoSentenceLines(el.value);
    refreshSplitOffer();
    el.focus();
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Title</span>
        <input
          name="title"
          required
          defaultValue={text?.title ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="text-arabic"
            className="text-sm text-[var(--ink-muted)]"
          >
            Arabic
          </label>
          {canSplit ? (
            <button
              type="button"
              onClick={splitIntoLines}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Split into sentence lines
            </button>
          ) : null}
        </div>
        <textarea
          id="text-arabic"
          ref={arabicRef}
          name="arabic"
          required
          rows={10}
          dir="rtl"
          lang="ar"
          defaultValue={text?.arabic ?? ""}
          onInput={refreshSplitOffer}
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xl leading-relaxed outline-none focus:border-[var(--accent)]"
          placeholder="الصق النص هنا…"
        />
        {canSplit ? (
          <p className="text-xs text-[var(--ink-muted)]">
            Breaks on . ؟ ! and similar marks. Review, then save. Line numbers
            for examples update only after save.
          </p>
        ) : null}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">
          Translation (optional)
        </span>
        <textarea
          name="translation"
          rows={4}
          defaultValue={text?.translation ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Source</span>
          <input
            name="source"
            defaultValue={text?.source ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="Lesson, chat, book…"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Date</span>
          <input
            type="date"
            name="occurred_on"
            defaultValue={text?.occurred_on ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={text?.notes ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <TagField defaultValue={props.mode === "edit" ? props.tagsInput : ""} />

      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <FormSubmit
        pending={pending}
        label={props.mode === "create" ? "Save text" : "Save changes"}
      />
    </form>
  );
}
