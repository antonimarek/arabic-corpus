import { describe, expect, it } from "vitest";

import {
  alignDialogue,
  chooseTurnText,
  extractSttForWindow,
  mergeConsecutiveSegments,
  sliceChunkText,
  turnTextSimilarity,
  withSegmentEnds,
} from "./align";
import type { FathomSegment } from "./fathom-parse";

describe("sliceChunkText", () => {
  it("extracts proportional slice from a timed chunk", () => {
    const chunk = {
      startSeconds: 0,
      durationSeconds: 100,
      text: "one two three four five six seven eight nine ten",
    };
    expect(sliceChunkText(chunk, 0, 50)).toContain("one two");
    expect(sliceChunkText(chunk, 50, 100)).toContain("nine ten");
  });
});

describe("turnTextSimilarity", () => {
  it("scores identical token sets highly", () => {
    expect(turnTextSimilarity("I'm tired Tavan", "I'm tired Tavan")).toBe(1);
  });

  it("scores unrelated strings low", () => {
    expect(turnTextSimilarity("on. What? أنا", "Hello, I'm Antoni.")).toBeLessThan(0.2);
  });
});

describe("chooseTurnText", () => {
  it("falls back to fathom on empty STT", () => {
    const chosen = chooseTurnText({
      sttText: "",
      fathomText: "Hello",
      durationSeconds: 3,
    });
    expect(chosen.source).toBe("fathom_fallback");
    expect(chosen.text).toBe("Hello");
  });

  it("keeps STT when it alone has Arabic", () => {
    const chosen = chooseTurnText({
      sttText: "أنا تعبان شوي",
      fathomText: "I'm Tavan",
      durationSeconds: 4,
    });
    expect(chosen.text).toBe("أنا تعبان شوي");
    expect(["stt", "mixed"]).toContain(chosen.source);
  });

  it("prefers fathom on short mismatched windows", () => {
    const chosen = chooseTurnText({
      sttText: "on. What? maybe I heard that",
      fathomText: "Hello, I'm Antoni.",
      durationSeconds: 2,
    });
    expect(chosen.source).toBe("fathom_fallback");
    expect(chosen.text).toBe("Hello, I'm Antoni.");
  });

  it("prefers wispr wording when it matches the timed turn", () => {
    const chosen = chooseTurnText({
      sttText: "on. What?",
      fathomText: "Hello, I'm Antoni.",
      wisprText: "Hello, I'm Antoni. Marhaba.",
      durationSeconds: 2,
    });
    expect(chosen.source).toBe("wispr");
    expect(chosen.text).toContain("Hello");
  });
});

describe("alignDialogue", () => {
  const fathom: FathomSegment[] = [
    {
      timestampSeconds: 10,
      timestampLabel: "0:10",
      speaker: "Speaker 2",
      text: "ana bfaddel",
    },
    {
      timestampSeconds: 20,
      timestampLabel: "0:20",
      speaker: "Student",
      text: "what means",
    },
  ];

  const chunks = [
    {
      startSeconds: 0,
      durationSeconds: 30,
      text: "أنا بفضل إني أكون لحالي. What means بفضل?",
    },
  ];

  it("maps fathom speakers to roles and prefers STT text", () => {
    const turns = alignDialogue({
      fathomSegments: fathom,
      sttChunks: chunks,
      totalSeconds: 30,
      mergeSameSpeaker: false,
    });

    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe("TUTOR");
    expect(turns[0]?.sttText.length).toBeGreaterThan(0);
    expect(turns[0]?.text.length).toBeGreaterThan(0);
    expect(turns[1]?.role).toBe("STUDENT");
  });

  it("merges consecutive same-speaker segments by default", () => {
    const merged = mergeConsecutiveSegments(
      withSegmentEnds(
        [
          { timestampSeconds: 0, timestampLabel: "0:00", speaker: "Student", text: "a" },
          { timestampSeconds: 5, timestampLabel: "0:05", speaker: "Student", text: "b" },
          { timestampSeconds: 10, timestampLabel: "0:10", speaker: "Speaker 2", text: "c" },
        ],
        20,
      ),
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]?.text).toBe("a b");
  });

  it("falls back to fathom when STT window is empty", () => {
    const turns = alignDialogue({
      fathomSegments: fathom,
      sttChunks: [],
      totalSeconds: 30,
      mergeSameSpeaker: false,
    });
    expect(turns[0]?.source).toBe("fathom_fallback");
    expect(turns[0]?.text).toBe("ana bfaddel");
  });

  it("extracts across overlapping chunks", () => {
    const text = extractSttForWindow(
      [
        { startSeconds: 0, durationSeconds: 10, text: "hello " },
        { startSeconds: 8, durationSeconds: 10, text: "world" },
      ],
      0,
      15,
    );
    expect(text).toContain("hello");
    expect(text).toMatch(/worl/);
  });
});
