type EntityType = "text" | "example" | "vocabulary" | "structure";

const STYLES: Record<EntityType, string> = {
  text: "bg-[#f3e9dc] text-[#7a4f22]",
  example: "bg-[#ece8e1] text-[#4f4840]",
  vocabulary: "bg-[#dff0ec] text-[#0e5a4f]",
  structure: "bg-[#f1e4ea] text-[#6e3550]",
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
