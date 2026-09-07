import { describe, expect, it } from "vitest";

import {
  mergeConsecutiveWisprTurns,
  parseWisprTranscript,
} from "./wispr-parse";
import { wisprTurnsToDialogue } from "./wispr-dialogue";

describe("wisprTurnsToDialogue", () => {
  it("builds dialogue turns from Wispr speakers without clock times", () => {
    const wispr = mergeConsecutiveWisprTurns(
      parseWisprTranscript(`Moayad: مرحبا.
Antoni Marek (You): مرحبا، كيفك؟
Moayad: اليوم كان يوم عادي.`),
    );

    const turns = wisprTurnsToDialogue({ turns: wispr });

    expect(turns).toHaveLength(3);
    expect(turns[0]).toMatchObject({
      role: "TUTOR",
      speaker: "Moayad",
      text: "مرحبا.",
      wisprText: "مرحبا.",
      source: "wispr",
      timestampLabel: "L1",
      startSeconds: 0,
      endSeconds: 0,
    });
    expect(turns[1]?.role).toBe("STUDENT");
    expect(turns[1]?.timestampLabel).toBe("L2");
    expect(turns[2]?.text).toBe("اليوم كان يوم عادي.");
  });

  it("treats Speaker 1 as tutor when configured", () => {
    const wispr = parseWisprTranscript(
      `Speaker 1: تعبان؟
Antoni Marek: شوي.`,
      { tutorNames: ["moayad", "speaker 1", "speaker 2"] },
    );

    const turns = wisprTurnsToDialogue({ turns: wispr });

    expect(turns.map((turn) => turn.role)).toEqual(["TUTOR", "STUDENT"]);
    expect(turns[0]?.speaker).toBe("Speaker 1");
  });
});
