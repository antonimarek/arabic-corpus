"use client";

import { useMemo, useState } from "react";

import { optionMatchesQuery } from "@/lib/option-filter";

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
  const [query, setQuery] = useState("");
  const [checkedIds, setCheckedIds] = useState(() => new Set(selectedIds));
  const showSearch = options.length > 4;
  const ordered = useMemo(() => {
    const matching = (option: Option) =>
      checkedIds.has(option.id) || optionMatchesQuery(option, query);
    const visible = options.filter(matching);
    const hidden = options.filter((option) => !matching(option));
    return [
      ...visible.filter((option) => checkedIds.has(option.id)),
      ...visible.filter((option) => !checkedIds.has(option.id)),
      ...hidden,
    ];
  }, [checkedIds, options, query]);
  const visibleCount = ordered.filter(
    (option) =>
      checkedIds.has(option.id) || optionMatchesQuery(option, query),
  ).length;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-[var(--ink-muted)]">
        {label}
        {checkedIds.size > 0 ? ` (${checkedIds.size})` : null}
      </legend>
      {options.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {showSearch ? (
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter…"
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          ) : null}
          <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)]">
            {query.trim() && visibleCount === 0 ? (
              <p className="px-3 py-2.5 text-sm text-[var(--ink-muted)]">
                No matches.
              </p>
            ) : null}
            <ul className="divide-y divide-[var(--line)]">
              {ordered.map((option) => {
                const visible =
                  checkedIds.has(option.id) ||
                  optionMatchesQuery(option, query);
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
                        defaultChecked={selectedIds.includes(option.id)}
                        className="mt-1"
                        onChange={(event) => {
                          setCheckedIds((prev) => {
                            const next = new Set(prev);
                            if (event.target.checked) {
                              next.add(option.id);
                            } else {
                              next.delete(option.id);
                            }
                            return next;
                          });
                        }}
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
