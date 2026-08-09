"use client";

import { useActionState } from "react";

import {
  createStructure,
  updateStructure,
  type StructureFormState,
} from "@/app/(app)/structures/actions";
import { FormSubmit } from "@/components/form-submit";
import { MultiCheckPicker } from "@/components/multi-check-picker";
import { TagField } from "@/components/tag-field";
import type { Structure } from "@/types/database";

const initialState: StructureFormState = {};

type ExampleOption = {
  id: string;
  label: string;
  hint?: string | null;
};

type StructureFormProps =
  | { mode: "create"; exampleOptions: ExampleOption[] }
  | {
      mode: "edit";
      structure: Structure;
      exampleOptions: ExampleOption[];
      selectedExampleIds: string[];
      tagsInput: string;
    };

export function StructureForm(props: StructureFormProps) {
  const action =
    props.mode === "create"
      ? createStructure
      : updateStructure.bind(null, props.structure.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const structure = props.mode === "edit" ? props.structure : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Name</span>
        <input
          name="name"
          required
          defaultValue={structure?.name ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="عم + participle, بدي…"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Arabic form</span>
        <input
          name="arabic_form"
          dir="rtl"
          lang="ar"
          defaultValue={structure?.arabic_form ?? ""}
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xl outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Transliteration</span>
        <input
          name="transliteration"
          defaultValue={structure?.transliteration ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Meaning</span>
        <input
          name="meaning"
          defaultValue={structure?.meaning ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Explanation</span>
        <textarea
          name="explanation"
          rows={4}
          defaultValue={structure?.explanation ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={structure?.notes ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <MultiCheckPicker
        name="example_ids"
        label="Linked examples"
        options={props.exampleOptions}
        selectedIds={
          props.mode === "edit" ? props.selectedExampleIds : undefined
        }
        emptyHint="No examples yet. Add an example first, then link it here."
      />

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
          props.mode === "create" ? "Save structure" : "Save changes"
        }
      />
    </form>
  );
}
