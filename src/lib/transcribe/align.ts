import type { FathomSegment } from "./fathom-parse";
import { normalizeSpeaker } from "./fathom-parse";

export type SttChunk = {
  startSeconds: number;
  durationSeconds: number;
  text: string;
};

export type DialogueTurn = {
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string;
  role: "TUTOR" | "STUDENT";
  speaker: string;
  text: string;
  fathomText: string;
  source: "stt" | "fathom_fallback" | "mixed";
  url?: string;
};

function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function snapStart(text: string, index: number): number {
  if (index <= 0) return 0;
  const prev = text[index - 1];
  if (prev === " " || prev === "\n") return index;
  const space = text.indexOf(" ", index);
  return space === -1 ? index : space + 1;
}

function snapEnd(text: string, index: number): number {
  if (index >= text.length) return text.length;
  const prev = text[index - 1];
  if (prev === " " || prev === "\n" || index === 0) return index;
  const space = text.lastIndexOf(" ", index);
  return space === -1 ? index : space;
}

export function sliceChunkText(
  chunk: SttChunk,
  windowStart: number,
  windowEnd: number,
): string {
  const chunkStart = chunk.startSeconds;
  const chunkEnd = chunk.startSeconds + chunk.durationSeconds;
  const overlapStart = Math.max(chunkStart, windowStart);
  const overlapEnd = Math.min(chunkEnd, windowEnd);
  if (overlapEnd <= overlapStart || chunk.durationSeconds <= 0) return "";

  const ratioStart = (overlapStart - chunkStart) / chunk.durationSeconds;
  const ratioEnd = (overlapEnd - chunkStart) / chunk.durationSeconds;
  const rawStart = Math.floor(ratioStart * chunk.text.length);
  const rawEnd = Math.ceil(ratioEnd * chunk.text.length);
  const start = snapStart(chunk.text, rawStart);
  const end = snapEnd(chunk.text, rawEnd);
  return chunk.text.slice(start, end).trim();
}

export function extractSttForWindow(
  chunks: SttChunk[],
  windowStart: number,
  windowEnd: number,
): string {
  const parts: string[] = [];
  for (const chunk of chunks) {
    const slice = sliceChunkText(chunk, windowStart, windowEnd);
    if (slice) parts.push(slice);
  }
  return dedupeOverlap(parts.join(" "));
}

function dedupeOverlap(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function withSegmentEnds(
  segments: FathomSegment[],
  totalSeconds: number,
): Array<FathomSegment & { endSeconds: number }> {
  return segments.map((segment, index) => {
    const next = segments[index + 1];
    const endSeconds = next?.timestampSeconds ?? totalSeconds;
    return { ...segment, endSeconds: Math.max(endSeconds, segment.timestampSeconds + 1) };
  });
}

export function mergeConsecutiveSegments(
  segments: Array<FathomSegment & { endSeconds: number }>,
): Array<FathomSegment & { endSeconds: number }> {
  if (segments.length === 0) return [];

  const merged: Array<FathomSegment & { endSeconds: number }> = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.speaker === current.speaker) {
      current = {
        ...current,
        text: `${current.text} ${segment.text}`.trim(),
        endSeconds: segment.endSeconds,
      };
      continue;
    }
    merged.push(current);
    current = { ...segment };
  }
  merged.push(current);
  return merged;
}

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function alignDialogue(params: {
  fathomSegments: FathomSegment[];
  sttChunks: SttChunk[];
  totalSeconds: number;
  tutorNames?: string[];
  mergeSameSpeaker?: boolean;
}): DialogueTurn[] {
  const tutorNames = params.tutorNames ?? ["Speaker 2"];
  const withEnds = withSegmentEnds(params.fathomSegments, params.totalSeconds);
  const segments = params.mergeSameSpeaker === false ? withEnds : mergeConsecutiveSegments(withEnds);

  return segments.map((segment) => {
    const sttText = extractSttForWindow(
      params.sttChunks,
      segment.timestampSeconds,
      segment.endSeconds,
    );
    const fathomText = segment.text.trim();
    let text = sttText;
    let source: DialogueTurn["source"] = "stt";

    if (!text) {
      text = fathomText;
      source = "fathom_fallback";
    } else if (hasArabic(fathomText) && !hasArabic(sttText) && sttText.length < fathomText.length * 0.5) {
      text = fathomText;
      source = "fathom_fallback";
    } else if (text.length < 8 && fathomText.length > text.length) {
      text = fathomText;
      source = "fathom_fallback";
    }

    return {
      startSeconds: segment.timestampSeconds,
      endSeconds: segment.endSeconds,
      timestampLabel: formatTimestamp(segment.timestampSeconds),
      role: normalizeSpeaker(segment.speaker, tutorNames),
      speaker: segment.speaker,
      text,
      fathomText,
      source,
      url: segment.url,
    };
  });
}

export function dialogueToMarkdown(turns: DialogueTurn[]): string {
  return turns
    .map((turn) => `[${turn.timestampLabel}] ${turn.role}\n${turn.text}`)
    .join("\n\n");
}

export function dialogueStats(turns: DialogueTurn[]) {
  const fallback = turns.filter((turn) => turn.source === "fathom_fallback").length;
  return {
    turnCount: turns.length,
    tutorTurns: turns.filter((turn) => turn.role === "TUTOR").length,
    studentTurns: turns.filter((turn) => turn.role === "STUDENT").length,
    fathomFallbackTurns: fallback,
  };
}
