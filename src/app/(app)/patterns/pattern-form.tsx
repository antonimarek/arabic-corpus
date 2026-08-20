"use client";

import { useActionState } from "react";

import {
  createPattern,
  updatePattern,
  type PatternFormState,
} from "@/app/(app)/patterns/actions";
import { FormSubmit } from "@/components/form-submit";
import {
  MASTERY_LABEL,
  MASTERY_STATES,
  PATTERN_ROLE_LABEL,
  PATTERN_ROLES,
  type PatternRole,
} from "@/lib/patterns";
import type { MorphPattern } from "@/types/database";

const initialState: PatternFormState = {};

type PatternFormProps =
  | {
      mode: "create";
      seedVocabularyId?: string;
      seedArabic?: string;
      seedRole?: PatternRole;
    }
  | {
      mode: "edit";
      pattern: MorphPattern;
    };

export function PatternForm(props: PatternFormProps) {
  const action =
    props.mode === "create"
      ? createPattern
      : updatePattern.bind(null, props.pattern.id);

  const [state, formAction, pending] = useActionState(action, initialState);
  const pattern = props.mode === "edit" ? props.pattern : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {props.mode === "create" && props.seedVocabularyId ? (
        <>
          <input
            type="hidden"
            name="seed_vocabulary_id"
            value={props.seedVocabularyId}
          />
          <p className="text-sm text-[var(--ink-muted)]">
            First word:{" "}
            <span className="font-arabic text-[var(--ink)]" lang="ar" dir="rtl">
              {props.seedArabic}
            </span>
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Role for that word</span>
            <select
              name="seed_role"
              defaultValue={props.seedRole ?? "base"}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            >
              {PATTERN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PATTERN_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Name</span>
        <input
          name="name"
          required
          defaultValue={pattern?.name ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="Double middle (cause / intensify)"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Arabic sketch</span>
        <input
          name="arabic_sketch"
          dir="rtl"
          lang="ar"
          defaultValue={pattern?.arabic_sketch ?? ""}
          className="font-arabic rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xl outline-none focus:border-[var(--accent)]"
          placeholder="فعّل"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Form label (optional)</span>
        <input
          name="form_label"
          defaultValue={pattern?.form_label ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="II, V, nisba…"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Cue — what to look for</span>
        <input
          name="cue"
          defaultValue={pattern?.cue ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="Shadda on the middle consonant"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Meaning shift</span>
        <textarea
          name="meaning_shift"
          rows={3}
          defaultValue={pattern?.meaning_shift ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-[var(--accent)]"
          placeholder="Often makes someone or something undergo or cause the action."
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={pattern?.notes ?? ""}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="Levantine quirks, MSA traps…"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Mastery</span>
        <select
          name="mastery_state"
          defaultValue={pattern?.mastery_state ?? "noticed"}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        >
          {MASTERY_STATES.map((state) => (
            <option key={state} value={state}>
              {MASTERY_LABEL[state]}
            </option>
          ))}
        </select>
      </label>

      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <FormSubmit
        pending={pending}
        label={props.mode === "create" ? "Save pattern" : "Save changes"}
      />
    </form>
  );
}
