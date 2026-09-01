export type AiProduceItem = {
  cueEn: string;
  sayAr: string;
  note?: string;
};

const PRODUCE_SECTION_RE = /##\s*Produce cold\b/i;
const NEXT_SECTION_RE = /^##\s+/m;

function cleanValue(raw: string): string {
  return raw
    .replace(/^>\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s*/, "")
    .trim();
}

function extractSection(markdown: string, headingPattern: RegExp): string {
  const match = headingPattern.exec(markdown);
  if (!match || match.index == null) return "";
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = NEXT_SECTION_RE.exec(rest);
  const end = next?.index ?? rest.length;
  return rest.slice(0, end).trim();
}

export function parseAiProduceCold(markdown: string): AiProduceItem[] {
  const section = extractSection(markdown, PRODUCE_SECTION_RE);
  if (!section) return [];

  const blocks = section.split(/\n(?=\*\s*\*\*Cue|\*\s*\*\*Say)/i).filter(Boolean);
  const items: AiProduceItem[] = [];
  let current: Partial<AiProduceItem> = {};

  const flush = () => {
    if (current.sayAr?.trim()) {
      items.push({
        cueEn: current.cueEn?.trim() || "Say in Arabic",
        sayAr: current.sayAr.trim(),
        note: current.note?.trim() || undefined,
      });
    }
    current = {};
  };

  for (const block of blocks) {
    const cueMatch = block.match(
      /\*\*Cue\s*\(English\):\*\*\s*([\s\S]*?)(?=\n\*\s*\*\*|$)/i,
    );
    const sayMatch = block.match(
      /\*\*Say\s*\(Arabic\):\*\*\s*([\s\S]*?)(?=\n\*\s*\*\*Note|\n\*\s*\*\*Cue|$)/i,
    );
    const noteMatch = block.match(/\*\*Note:\*\*\s*([\s\S]*?)(?=\n\*\s*\*\*|$)/i);

    if (cueMatch || sayMatch) {
      if (current.sayAr) flush();
      if (cueMatch) current.cueEn = cleanValue(cueMatch[1] ?? "");
      if (sayMatch) current.sayAr = cleanValue(sayMatch[1] ?? "");
      if (noteMatch) current.note = cleanValue(noteMatch[1] ?? "");
    }
  }
  flush();

  return items;
}
