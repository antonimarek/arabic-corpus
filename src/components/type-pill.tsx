type EntityType = "text" | "example" | "vocabulary" | "structure";

const STYLES: Record<EntityType, string> = {
  text: "bg-[color-mix(in_srgb,var(--grade-hard)_13%,transparent)] text-[var(--grade-hard)]",
  example: "bg-[color-mix(in_srgb,var(--ink-muted)_13%,transparent)] text-[var(--ink-muted)]",
  vocabulary: "bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--accent)]",
  structure: "bg-[color-mix(in_srgb,var(--link-structure)_13%,transparent)] text-[var(--link-structure)]",
};

const LABELS: Record<EntityType, string> = {
  text: "Text",
  example: "Example",
  vocabulary: "Vocab",
  structure: "Structure",
};

export function TypePill({ type }: { type: EntityType }) {
  return (
    <span
      className={`inline-block rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium tracking-wide ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}
