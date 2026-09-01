import type { DialogueTurn } from "./align";

export type CorpusDialogueLine = {
  role: "TUTOR" | "STUDENT";
  text: string;
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string;
  turnCount: number;
};

export function mergeTurnsByRole(turns: DialogueTurn[]): CorpusDialogueLine[] {
  if (turns.length === 0) return [];

  const merged: CorpusDialogueLine[] = [];
  let current: CorpusDialogueLine = {
    role: turns[0].role,
    text: turns[0].text.trim(),
    startSeconds: turns[0].startSeconds,
    endSeconds: turns[0].endSeconds,
    timestampLabel: turns[0].timestampLabel,
    turnCount: 1,
  };

  for (let i = 1; i < turns.length; i += 1) {
    const turn = turns[i];
    if (turn.role === current.role) {
      current = {
        ...current,
        text: `${current.text} ${turn.text}`.replace(/\s+/g, " ").trim(),
        endSeconds: turn.endSeconds,
        turnCount: current.turnCount + 1,
      };
      continue;
    }
    merged.push(current);
    current = {
      role: turn.role,
      text: turn.text.trim(),
      startSeconds: turn.startSeconds,
      endSeconds: turn.endSeconds,
      timestampLabel: turn.timestampLabel,
      turnCount: 1,
    };
  }
  merged.push(current);
  return merged;
}

export function formatCorpusArabicLine(line: CorpusDialogueLine): string {
  return `[${line.role}] ${line.text}`;
}

export function corpusLineStartsMs(lines: CorpusDialogueLine[]): number[] {
  return lines.map((line) => Math.round(line.startSeconds * 1000));
}

export function buildCorpusArabicText(lines: CorpusDialogueLine[]): string {
  return lines.map(formatCorpusArabicLine).join("\n");
}

export function buildCorpusNotes(params: {
  lesson: string;
  fathomUrl?: string;
  model?: string;
  turnCount: number;
  lineCount: number;
}): string {
  const parts = [
    "Imported from lesson transcription pipeline.",
    `Lesson id: ${params.lesson}`,
    `Dialogue turns: ${params.turnCount}`,
    `Corpus lines: ${params.lineCount}`,
  ];
  if (params.model) parts.push(`STT model: ${params.model}`);
  if (params.fathomUrl) parts.push(`Fathom: ${params.fathomUrl}`);
  parts.push("Study pack is available in the Study tab when imported.");
  return parts.join("\n");
}
