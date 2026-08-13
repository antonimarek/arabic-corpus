"use client";

import { useActionState, useState } from "react";

import {
  createExample,
  updateExample,
  type ExampleFormState,
} from "@/app/(app)/examples/actions";
import { FormSubmit } from "@/components/form-submit";
import { MultiCheckPicker } from "@/components/multi-check-picker";
import { TagField } from "@/components/tag-field";
import type { Example } from "@/types/database";

const initialState: ExampleFormState = {};

type Option = {
  id: string;
  label: string;
  hint?: string | null;
};

type ExampleFormProps =
  | {
      mode: "create";
      textOptions: Option[];
      vocabularyOptions: Option[];
      structureOptions: Option[];
      defaultTextId?: string;
      defaultSourceLine?: string;
      defaultArabic?: string;
      defaultVocabularyIds?: string[];
      defaultStructureIds?: string[];
    }
  | {
      mode: "edit";
      example: Example;
      textOptions: Option[];
      vocabularyOptions: Option[];
      structureOptions: Option[];
      selectedVocabularyIds: string[];
      selectedStructureIds: string[];
      tagsInput: string;
    };

export function ExampleForm(props: ExampleFormProps) {
  const action =
    props.mode === "create"
      ? createExample
      : updateExample.bind(null, props.example.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const example = props.mode === "edit" ? props.example : null;

  const defaultTextId =
    props.mode === "edit"
      ? (example?.text_id ?? "")
      : (props.defaultTextId ?? "");

  const defaultSourceLine =
    props.mode === "edit"
      ? (example?.source_line != null ? String(example.source_line) : "")
      : (props.defaultSourceLine ?? "");

  const defaultArabic =
    props.mode === "edit"
      ? (example?.arabic ?? "")
      : (props.defaultArabic ?? "");

  const selectedVocabularyIds =
    props.mode === "edit"
      ? props.selectedVocabularyIds
      : (props.defaultVocabularyIds ?? []);

  const selectedStructureIds =
    props.mode === "edit"
      ? props.selectedStructureIds
      : (props.defaultStructureIds ?? []);

  const extrasOpen = props.mode === "edit";
  const [moreOpen, setMoreOpen] = useState(extrasOpen);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Arabic</span>
        <textarea
          name="arabic"
          required
          rows={3}
          dir="rtl"
          lang="ar"
          defaultValue={defaultArabic}
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xl leading-relaxed outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">
          Translation (optional)
        </span>
        <textarea
          name="translation"
          rows={2}
          defaultValue={example?.translation ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <details
        className="flex flex-col gap-5"
        open={moreOpen}
        onToggle={(event) => {
          setMoreOpen(event.currentTarget.open);
        }}
      >
        <summary className="cursor-pointer text-sm text-[var(--accent)]">
          Source, links, notes
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">
              Transliteration
            </span>
            <input
              name="transliteration"
              defaultValue={example?.transliteration ?? ""}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Source text</span>
            <select
              name="text_id"
              defaultValue={defaultTextId}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            >
              <option value="">None (free-standing)</option>
              {props.textOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Source line</span>
            <input
              name="source_line"
              type="number"
              min={1}
              step={1}
              defaultValue={defaultSourceLine}
              placeholder="Optional line number in source text"
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <MultiCheckPicker
            name="vocabulary_ids"
            label="Vocabulary"
            options={props.vocabularyOptions}
            selectedIds={selectedVocabularyIds}
            emptyHint="No vocabulary yet."
          />

          <MultiCheckPicker
            name="structure_ids"
            label="Structures"
            options={props.structureOptions}
            selectedIds={selectedStructureIds}
            emptyHint="No structures yet."
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={example?.notes ?? ""}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <TagField
            defaultValue={props.mode === "edit" ? props.tagsInput : ""}
          />
        </div>
      </details>

      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <FormSubmit
        pending={pending}
        label={props.mode === "create" ? "Save example" : "Save changes"}
      />
    </form>
  );
}
