type EntityType = "text" | "example" | "vocabulary" | "structure";

const STYLES: Record<EntityType, string> = {
  text: "bg-[#e8ebe4] text-[#2f4f4a]",
  example: "bg-[#ebe6df] text-[#5c4a3a]",
  vocabulary: "bg-[#e4e8eb] text-[#3a4a5c]",
  structure: "bg-[#ebe4e8] text-[#5c3a4a]",
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
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}
