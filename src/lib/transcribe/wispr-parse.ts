export type WisprTurn = {
  speaker: string;
  text: string;
  role: "TUTOR" | "STUDENT" | "OTHER";
};

const LINE_RE = /^([^:\n]+):\s*(.*)$/;

const DEFAULT_STUDENT_NAMES = ["antoni", "antoni marek", "antoni marek (you)", "you"];
const DEFAULT_TUTOR_NAMES = ["moayad", "speaker 2"];

export function normalizeWisprSpeakerName(speaker: string): string {
  return speaker
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(you\)\s*$/i, "")
    .trim();
}

export function wisprRoleForSpeaker(
  speaker: string,
  options?: {
    studentNames?: string[];
    tutorNames?: string[];
  },
): "TUTOR" | "STUDENT" | "OTHER" {
  const name = normalizeWisprSpeakerName(speaker);
  const students = (options?.studentNames ?? DEFAULT_STUDENT_NAMES).map((item) =>
    normalizeWisprSpeakerName(item),
  );
  const tutors = (options?.tutorNames ?? DEFAULT_TUTOR_NAMES).map((item) =>
    normalizeWisprSpeakerName(item),
  );

  if (tutors.some((tutor) => name === tutor || name.startsWith(`${tutor} `))) {
    return "TUTOR";
  }
  if (students.some((student) => name === student || name.startsWith(`${student} `))) {
    return "STUDENT";
  }
  if (name.includes("antoni")) return "STUDENT";
  if (name.includes("moayad")) return "TUTOR";
  return "OTHER";
}

/** Parse Wispr Flow `Speaker: text` lines. Skips blank lines and trailing notes. */
export function parseWisprTranscript(
  content: string,
  options?: {
    studentNames?: string[];
    tutorNames?: string[];
    dropOther?: boolean;
  },
): WisprTurn[] {
  const turns: WisprTurn[] = [];
  const dropOther = options?.dropOther ?? true;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^this is a transcript made by wispr/i.test(line)) continue;

    const match = LINE_RE.exec(line);
    if (!match) continue;

    const speaker = (match[1] ?? "").trim();
    const text = (match[2] ?? "").trim();
    if (!speaker || !text) continue;

    const role = wisprRoleForSpeaker(speaker, options);
    if (dropOther && role === "OTHER") continue;

    turns.push({ speaker, text, role });
  }

  return turns;
}

export function mergeConsecutiveWisprTurns(turns: WisprTurn[]): WisprTurn[] {
  if (turns.length === 0) return [];

  const merged: WisprTurn[] = [];
  let current = { ...turns[0] };

  for (let i = 1; i < turns.length; i += 1) {
    const turn = turns[i];
    if (turn.speaker === current.speaker && turn.role === current.role) {
      current = {
        ...current,
        text: `${current.text} ${turn.text}`.replace(/\s+/g, " ").trim(),
      };
      continue;
    }
    merged.push(current);
    current = { ...turn };
  }
  merged.push(current);
  return merged;
}
