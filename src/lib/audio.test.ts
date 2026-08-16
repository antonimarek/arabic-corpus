import { describe, expect, it } from "vitest";

import {
  audioExtension,
  formatPlaybackClock,
  isAllowedAudioFile,
  lineAtTimeMs,
  linePlaybackWindow,
  setLineStart,
  textAudioPath,
  toStoredLineStarts,
} from "@/lib/audio";

describe("audio helpers", () => {
  it("maps WhatsApp ogg mime and filename to ogg", () => {
    expect(audioExtension({ type: "audio/ogg; codecs=opus" })).toBe("ogg");
    expect(audioExtension({ type: "", name: "voice-note.opus" })).toBe("opus");
  });

  it("rejects files over 20 MB", () => {
    const result = isAllowedAudioFile({
      type: "audio/ogg",
      size: 21 * 1024 * 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("builds a user-folder storage path without the original filename", () => {
    expect(textAudioPath("user-1", "text-9", "ogg")).toBe(
      "user-1/text-9/audio.ogg",
    );
  });

  it("stores unmarked lines as -1 and stamps the playhead", () => {
    const starts = setLineStart([], 3, 5200);
    expect(toStoredLineStarts(starts)).toEqual([-1, -1, 5200]);
    expect(linePlaybackWindow(starts, 3, 9000)).toEqual({
      startMs: 5200,
      endMs: 9000,
    });
  });

  it("formats a playback clock", () => {
    expect(formatPlaybackClock(0)).toBe("0:00");
    expect(formatPlaybackClock(83736)).toBe("1:23");
  });

  it("finds the current line from stamped starts", () => {
    expect(lineAtTimeMs([0, 1200, 4000], 2500)).toBe(2);
    expect(lineAtTimeMs([null, 1200], 200)).toBeNull();
  });

  it("ends a line window at the next marked start", () => {
    const starts = setLineStart(setLineStart([], 1, 200), 2, 1400);
    expect(linePlaybackWindow(starts, 1, 8000)).toEqual({
      startMs: 200,
      endMs: 1400,
    });
  });

  it("returns null for an unmarked line", () => {
    expect(linePlaybackWindow([0, null, 4000], 2, 9000)).toBeNull();
  });
});
