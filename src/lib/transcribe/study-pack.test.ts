import { describe, expect, it } from "vitest";

import type { DialogueTurn } from "@/lib/transcribe/align";
import {
  buildStudyPack,
  isStudyPackV2,
  normalizeStudyPack,
} from "@/lib/transcribe/study-pack";

function turn(partial: Partial<DialogueTurn> & Pick<DialogueTurn, "role" | "text">): DialogueTurn {
  return {
    startSeconds: 0,
    endSeconds: 5,
    timestampLabel: "1:00",
    speaker: partial.role === "TUTOR" ? "Speaker 2" : "Student",
    fathomText: partial.text,
    sttText: partial.text,
    source: "stt",
    similarity: 1,
    ...partial,
  };
}

describe("buildStudyPack v2", () => {
  it("builds recall cards from tutor Arabic with English cue", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({
        role: "TUTOR",
        text: "اليوم الجاي means next time in the future.",
        timestampLabel: "5:00",
      }),
    ], ["5:00"]);

    expect(isStudyPackV2(pack)).toBe(true);
    expect(pack.recallCards.length).toBeGreaterThan(0);
    expect(pack.recallCards[0]?.targetAr).toContain("اليوم الجاي");
    expect(pack.recallCards[0]?.lineNumber).toBe(1);
  });

  it("builds correction cards from student + tutor pair", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({
        role: "STUDENT",
        text: "I said the wrong thing",
        timestampLabel: "2:00",
      }),
      turn({
        role: "TUTOR",
        text: "You can say أنا بفضل instead of that.",
        timestampLabel: "2:05",
      }),
    ], ["2:00", "2:05"]);

    expect(pack.corrections.length).toBe(1);
    expect(pack.corrections[0]?.tutorSaid).toContain("أنا بفضل");
  });

  it("detects confusion moments", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({
        role: "STUDENT",
        text: "What means بفضل?",
        timestampLabel: "3:00",
      }),
      turn({
        role: "TUTOR",
        text: "It means prefer.",
        timestampLabel: "3:05",
      }),
    ]);

    expect(pack.confusionMoments).toHaveLength(1);
    expect(pack.confusionMoments[0]?.tutor).toContain("prefer");
  });
});

describe("normalizeStudyPack", () => {
  it("accepts v2 packs", () => {
    const pack = normalizeStudyPack({
      version: 2,
      lesson: "x",
      generatedAt: "now",
      weeklyPlan: [],
      recallCards: [],
      corrections: [],
      contrasts: [],
      confusionMoments: [],
      grammarThreads: [],
    });
    expect(pack?.version).toBe(2);
  });

  it("accepts legacy v1 packs", () => {
    const pack = normalizeStudyPack({
      lesson: "x",
      generatedAt: "now",
      weeklyPlan: [],
      recallPhrases: [],
      confusionMoments: [],
      grammarThreads: [],
    });
    expect(pack && !isStudyPackV2(pack)).toBe(true);
  });
});
