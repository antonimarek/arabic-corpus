export type WisprTurn = {
  speaker: string;
  text: string;
  role: "TUTOR" | "STUDENT" | "OTHER";
  /** Present when export uses `[MM:SS] Name: text` lines. */
  startSeconds?: number;
};

/** Optional `[MM:SS]` / `[H:MM:SS]` prefix, then `Name: text`. */
const LINE_RE =
  /^(?:\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*)?([^:\n]+):\s*(.*)$/;

const DEFAULT_STUDENT_NAMES = ["antoni", "antoni marek", "antoni marek (you)", "you"];
const DEFAULT_TUTOR_NAMES = ["moayad", "speaker 1", "speaker 2", "speaker 3", "audio"];

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

    const hours = match[1] != null ? Number(match[1]) : null;
    const minutes = match[2] != null ? Number(match[2]) : null;
    const seconds = match[3] != null ? Number(match[3]) : null;
    const speaker = (match[4] ?? "").trim();
    const text = (match[5] ?? "").trim();
    if (!speaker || !text) continue;
    // Skip markdown / section labels mistaken as speakers.
    if (speaker.startsWith("#") || speaker.length > 80) continue;

    const role = wisprRoleForSpeaker(speaker, options);
    if (dropOther && role === "OTHER") continue;

    let startSeconds: number | undefined;
    if (minutes != null && seconds != null && !Number.isNaN(minutes) && !Number.isNaN(seconds)) {
      const h = hours != null && !Number.isNaN(hours) ? hours : 0;
      startSeconds = h * 3600 + minutes * 60 + seconds;
    }

    turns.push({ speaker, text, role, startSeconds });
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
