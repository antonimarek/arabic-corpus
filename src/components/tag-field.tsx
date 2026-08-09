type TagFieldProps = {
  defaultValue?: string;
  name?: string;
};

export function TagField({
  defaultValue = "",
  name = "tags",
}: TagFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-[var(--ink-muted)]">Tags</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        placeholder="dialogue, lesson-8, Beirut…"
      />
      <span className="text-xs text-[var(--ink-muted)]">
        Comma-separated. Free-form.
      </span>
    </label>
  );
}
