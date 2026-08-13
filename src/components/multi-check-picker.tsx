"use client";

import { useState } from "react";

type Option = {
  id: string;
  label: string;
  hint?: string | null;
};

type MultiCheckPickerProps = {
  name: string;
  label: string;
  options: Option[];
  selectedIds?: string[];
  emptyHint?: string;
};

export function MultiCheckPicker({
  name,
  label,
  options,
  selectedIds = [],
  emptyHint = "None yet.",
}: MultiCheckPickerProps) {
  const selected = new Set(selectedIds);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-[var(--ink-muted)]">{label}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {options.length > 6 ? (
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter…"
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          ) : null}
          <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)]">
            {needle &&
            options.every((option) => {
              const hay = `${option.label} ${option.hint ?? ""}`.toLowerCase();
              return !hay.includes(needle);
            }) ? (
              <p className="px-3 py-2.5 text-sm text-[var(--ink-muted)]">
                No matches.
              </p>
            ) : null}
            <ul className="divide-y divide-[var(--line)]">
              {options.map((option) => {
                const hay = `${option.label} ${option.hint ?? ""}`.toLowerCase();
                const visible = !needle || hay.includes(needle);
                return (
                  <li
                    key={option.id}
                    className={visible ? undefined : "hidden"}
                  >
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-[var(--surface-hover)]">
                      <input
                        type="checkbox"
                        name={name}
                        value={option.id}
                        defaultChecked={selected.has(option.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-[var(--ink)]">
                          {option.label}
                        </span>
                        {option.hint ? (
                          <span className="block text-xs text-[var(--ink-muted)]">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </fieldset>
  );
}
