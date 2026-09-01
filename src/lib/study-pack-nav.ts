import { lineAtTimeMs, normalizeLineStarts } from "@/lib/audio";
import { lineHref } from "@/lib/text-lines";

/** Parse [m:ss] or [h:mm:ss] timestamp labels to milliseconds. */
export function parseTimestampLabel(label: string): number | null {
  const cleaned = label.replace(/[\[\]]/g, "").trim();
  const parts = cleaned.split(":").map((part) => Number(part.trim()));
  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return null;
}

export function lineNumberForTimestamp(
  timestampLabel: string,
  lineStartsMs: number[] | null,
): number | null {
  const ms = parseTimestampLabel(timestampLabel);
  if (ms == null || !lineStartsMs?.length) return null;
  return lineAtTimeMs(normalizeLineStarts(lineStartsMs), ms);
}

export function timestampLineHref(
  textId: string,
  timestampLabel: string,
  lineStartsMs: number[] | null,
): string | null {
  const lineNumber = lineNumberForTimestamp(timestampLabel, lineStartsMs);
  if (lineNumber == null) return null;
  return lineHref(textId, lineNumber);
}
