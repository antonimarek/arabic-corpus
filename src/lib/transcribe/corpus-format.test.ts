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
        sttText: "first",
        fathomText: "fathom-first",
        source: "stt",
        similarity: 1,
      },
      {
        startSeconds: 5,
        endSeconds: 10,
        timestampLabel: "0:05",
        role: "TUTOR",
        speaker: "Speaker 2",
        text: "second",
        sttText: "second",
        fathomText: "fathom-second",
        source: "stt",
        similarity: 1,
      },
      {
        startSeconds: 10,
        endSeconds: 15,
        timestampLabel: "0:10",
        role: "STUDENT",
        speaker: "Student",
        text: "reply",
        sttText: "reply",
        fathomText: "fathom-reply",
        source: "stt",
        similarity: 1,
      },
    ];

    const merged = mergeTurnsByRole(turns);
    expect(merged).toHaveLength(2);
    expect(buildCorpusArabicText(merged)).toContain("[TUTOR] first second");

    const fathomMerged = mergeTurnsByRole(turns, { textField: "fathomText" });
    expect(buildCorpusArabicText(fathomMerged)).toContain(
      "[TUTOR] fathom-first fathom-second",
    );
  });
});
