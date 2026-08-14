import { describe, expect, it } from "vitest";

import {
  audioExtension,
  isAllowedAudioFile,
  linePlaybackWindow,
  markedLineStartMs,
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

  it("subtracts 200 ms from a line mark and clamps at 0", () => {
    expect(markedLineStartMs(800)).toBe(600);
    expect(markedLineStartMs(50)).toBe(0);
    expect(markedLineStartMs(-12)).toBe(0);
  });

  it("stores unmarked lines as -1 and restores a playback window", () => {
    const starts = setLineStart([], 3, 5200);
    expect(toStoredLineStarts(starts)).toEqual([-1, -1, 5000]);
    expect(linePlaybackWindow(starts, 3, 9000)).toEqual({
      startMs: 5000,
      endMs: 9000,
    });
  });

  it("ends a line window at the next marked start", () => {
    const starts = setLineStart(setLineStart([], 1, 200), 2, 1400);
    expect(linePlaybackWindow(starts, 1, 8000)).toEqual({
      startMs: 0,
      endMs: 1200,
    });
  });

  it("returns null for an unmarked line", () => {
    expect(linePlaybackWindow([0, null, 4000], 2, 9000)).toBeNull();
  });
});
