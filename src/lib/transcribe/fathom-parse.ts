export type FathomSegment = {
  timestampSeconds: number;
  timestampLabel: string;
  speaker: string;
  text: string;
  url?: string;
};

const LINE_RE =
  /^\[(\d{2}):(\d{2})\]\(([^)]+)\)\s+([^:]+):\s*(.*)$/;

export function parseFathomTranscript(content: string): FathomSegment[] {
  const segments: FathomSegment[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = LINE_RE.exec(line);
    if (!match) continue;

    const minutes = Number.parseInt(match[1] ?? "0", 10);
    const seconds = Number.parseInt(match[2] ?? "0", 10);
    const url = match[3];
    const speaker = match[4]?.trim() ?? "Unknown";
    const text = (match[5] ?? "").replace(/\\!/g, "!").trim();

    segments.push({
      timestampSeconds: minutes * 60 + seconds,
      timestampLabel: `${match[1]}:${match[2]}`,
      speaker,
      text,
      url,
    });
  }

  return segments;
}

export function normalizeSpeaker(
  speaker: string,
  tutorNames: string[] = ["Speaker 2"],
): "TUTOR" | "STUDENT" {
  if (tutorNames.some((name) => speaker.toLowerCase() === name.toLowerCase())) {
    return "TUTOR";
  }
  return "STUDENT";
}

export function segmentsInWindow(
  segments: FathomSegment[],
  startSeconds: number,
  durationSeconds: number,
): FathomSegment[] {
  const endSeconds = startSeconds + durationSeconds;
  return segments.filter(
    (segment) =>
      segment.timestampSeconds >= startSeconds &&
      segment.timestampSeconds < endSeconds,
  );
}

export function toDialogueMarkdown(
  segments: FathomSegment[],
  options?: { tutorNames?: string[] },
): string {
  const tutorNames = options?.tutorNames ?? ["Speaker 2"];
  return segments
    .map((segment) => {
      const role = normalizeSpeaker(segment.speaker, tutorNames);
      return `[${segment.timestampLabel}] ${role}\n${segment.text}`;
    })
    .join("\n\n");
}
