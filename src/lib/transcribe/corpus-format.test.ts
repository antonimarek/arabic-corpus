import { describe, expect, it } from "vitest";

import type { DialogueTurn } from "./align";
import { buildCorpusArabicText, mergeTurnsByRole } from "./corpus-format";

describe("mergeTurnsByRole", () => {
  it("merges consecutive turns from the same speaker", () => {
    const turns: DialogueTurn[] = [
      {
        startSeconds: 0,
        endSeconds: 5,
        timestampLabel: "0:00",
        role: "TUTOR",
        speaker: "Speaker 2",
        text: "first",
        fathomText: "first",
        source: "stt",
      },
      {
        startSeconds: 5,
        endSeconds: 10,
        timestampLabel: "0:05",
        role: "TUTOR",
        speaker: "Speaker 2",
        text: "second",
        fathomText: "second",
        source: "stt",
      },
      {
        startSeconds: 10,
        endSeconds: 15,
        timestampLabel: "0:10",
        role: "STUDENT",
        speaker: "Student",
        text: "reply",
        fathomText: "reply",
        source: "stt",
      },
    ];

    const merged = mergeTurnsByRole(turns);
    expect(merged).toHaveLength(2);
    expect(buildCorpusArabicText(merged)).toContain("[TUTOR] first second");
  });
});
