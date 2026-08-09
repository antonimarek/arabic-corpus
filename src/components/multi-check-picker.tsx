"use client";

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

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-[var(--ink-muted)]">{label}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">{emptyHint}</p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)]">
          <ul className="divide-y divide-[var(--line)]">
            {options.map((option) => (
              <li key={option.id}>
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
            ))}
          </ul>
        </div>
      )}
    </fieldset>
  );
}
