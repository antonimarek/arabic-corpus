"use client";

import { useActionState, useState } from "react";

import {
  createVocabulary,
  updateVocabulary,
  type VocabularyFormState,
} from "@/app/(app)/vocabulary/actions";
import { FormSubmit } from "@/components/form-submit";
import { TagField } from "@/components/tag-field";
import type { Vocabulary, VocabularySense } from "@/types/database";

const initialState: VocabularyFormState = {};

type SenseDraft = { gloss: string; lang: string };

type VocabularyFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      vocabulary: Vocabulary;
      senses: VocabularySense[];
      tagsInput: string;
    };

export function VocabularyForm(props: VocabularyFormProps) {
  const action =
    props.mode === "create"
      ? createVocabulary
      : updateVocabulary.bind(null, props.vocabulary.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const vocabulary = props.mode === "edit" ? props.vocabulary : null;
  const [senses, setSenses] = useState<SenseDraft[]>(() => {
    if (props.mode === "edit" && props.senses.length > 0) {
      return props.senses.map((s) => ({ gloss: s.gloss, lang: s.lang }));
    }
    return [{ gloss: "", lang: "en" }];
  });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Arabic</span>
        <input
          name="arabic"
          required
          dir="rtl"
          lang="ar"
          defaultValue={vocabulary?.arabic ?? ""}
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xl outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            Transliteration
          </span>
          <input
            name="transliteration"
            defaultValue={vocabulary?.transliteration ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="shu, 3am…"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            Part of speech
          </span>
          <input
            name="part_of_speech"
            defaultValue={vocabulary?.part_of_speech ?? ""}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            placeholder="noun, verb, particle…"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm text-[var(--ink-muted)]">Senses</legend>
        {senses.map((sense, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-2">
              <span className="sr-only">Gloss {index + 1}</span>
              <input
                name="sense_gloss"
                required={index === 0}
                value={sense.gloss}
                onChange={(event) => {
                  const next = [...senses];
                  next[index] = { ...next[index], gloss: event.target.value };
                  setSenses(next);
                }}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
                placeholder="Gloss / meaning"
              />
            </label>
            <label className="flex w-full flex-col gap-2 sm:w-28">
              <span className="sr-only">Language</span>
              <select
                name="sense_lang"
                value={sense.lang}
                onChange={(event) => {
                  const next = [...senses];
                  next[index] = { ...next[index], lang: event.target.value };
                  setSenses(next);
                }}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
              >
                <option value="en">en</option>
                <option value="pl">pl</option>
              </select>
            </label>
            {senses.length > 1 ? (
              <button
                type="button"
                onClick={() => setSenses(senses.filter((_, i) => i !== index))}
                className="text-sm text-[var(--danger)] hover:underline sm:pb-2.5"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSenses([...senses, { gloss: "", lang: "en" }])}
          className="self-start text-sm text-[var(--accent)] hover:underline"
        >
          Add sense
        </button>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={vocabulary?.notes ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <TagField
        defaultValue={props.mode === "edit" ? props.tagsInput : ""}
      />

      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <FormSubmit
        pending={pending}
        label={
          props.mode === "create" ? "Save vocabulary" : "Save changes"
        }
      />
    </form>
  );
}
