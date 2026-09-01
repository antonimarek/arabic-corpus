export type DialogueRole = "TUTOR" | "STUDENT";

export type ParsedDialogueLine = {
  lineNumber: number;
  role: DialogueRole | null;
  text: string;
  raw: string;
};

const DIALOGUE_LINE_RE = /^\[(TUTOR|STUDENT)\]\s*(.*)$/u;

export function parseDialogueLine(raw: string): {
  role: DialogueRole | null;
  text: string;
} {
  const match = DIALOGUE_LINE_RE.exec(raw.trim());
  if (!match) {
    return { role: null, text: raw };
  }
  return {
    role: match[1] as DialogueRole,
    text: match[2]?.trim() ?? "",
  };
}

export function parseDialogueLines(arabic: string): ParsedDialogueLine[] {
  return arabic.split("\n").map((raw, index) => {
    const parsed = parseDialogueLine(raw);
    return {
      lineNumber: index + 1,
      role: parsed.role,
      text: parsed.text,
      raw,
    };
  });
}

export function roleLabel(role: DialogueRole | null): string {
  if (role === "TUTOR") return "Tutor";
  if (role === "STUDENT") return "You";
  return "Line";
}
