export const TEXT_AUDIO_BUCKET = "text-audio";
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
export const UNMARKED_LINE_START = -1;

const MIME_TO_EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

const NAME_TO_EXT: Record<string, string> = {
  ogg: "ogg",
  opus: "opus",
  m4a: "m4a",
  mp3: "mp3",
  mp4: "m4a",
  webm: "webm",
  wav: "wav",
  aac: "aac",
};

export function baseAudioMime(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function audioExtension(file: { type: string; name?: string }): string | null {
  const mime = baseAudioMime(file.type);
  if (mime && MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  const name = file.name ?? "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0) {
    const ext = name.slice(dot + 1).toLowerCase();
    if (NAME_TO_EXT[ext]) return NAME_TO_EXT[ext];
  }
  return null;
}

export function isAllowedAudioFile(file: { type: string; name?: string; size: number }): {
  ok: true;
  ext: string;
} | { ok: false; error: string } {
  if (file.size <= 0) {
    return { ok: false, error: "Audio file is empty." };
  }
  if (file.size > AUDIO_MAX_BYTES) {
    return { ok: false, error: "Audio must be 20 MB or smaller." };
  }
  const ext = audioExtension(file);
  if (!ext) {
    return {
      ok: false,
      error: "Use an ogg, opus, m4a, mp3, webm, or wav voice note.",
    };
  }
  return { ok: true, ext };
}

export function textAudioPath(userId: string, textId: string, ext: string): string {
  return `${userId}/${textId}/audio.${ext}`;
}

export function normalizeLineStarts(
  raw: number[] | null | undefined,
): (number | null)[] {
  return (raw ?? []).map((value) =>
    value == null || value < 0 ? null : value,
  );
}

export function toStoredLineStarts(starts: (number | null)[]): number[] {
  return starts.map((value) => (value == null ? UNMARKED_LINE_START : value));
}

export function setLineStart(
  current: (number | null)[],
  lineNumber: number,
  tapMs: number,
): (number | null)[] {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return current;
  const next = current.slice();
  while (next.length < lineNumber) next.push(null);
  next[lineNumber - 1] = stampLineStartMs(tapMs);
  return next;
}

export function stampLineStartMs(playheadMs: number): number {
  if (!Number.isFinite(playheadMs) || playheadMs < 0) return 0;
  return Math.round(playheadMs);
}

export function formatPlaybackClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function lineAtTimeMs(
  starts: (number | null)[],
  currentMs: number,
): number | null {
  if (!Number.isFinite(currentMs) || currentMs < 0) return null;
  let found: number | null = null;
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    if (start == null) continue;
    if (start <= currentMs) found = i + 1;
  }
  return found;
}

export function linePlaybackWindow(
  starts: (number | null)[],
  lineNumber: number,
  durationMs: number | null,
): { startMs: number; endMs: number } | null {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;
  const start = starts[lineNumber - 1];
  if (start == null) return null;
  let end = durationMs != null && durationMs > start ? durationMs : start;
  for (let i = lineNumber; i < starts.length; i += 1) {
    const next = starts[i];
    if (next != null && next > start) {
      end = next;
      break;
    }
  }
  return { startMs: start, endMs: end };
}
