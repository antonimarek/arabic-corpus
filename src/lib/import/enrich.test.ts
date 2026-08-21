import { describe, expect, it } from "vitest";

import { planVocabEnrich, type ExistingVocabularyState } from "./enrich";
import type { VocabularyWriteInput } from "@/lib/corpus/write";

function existing(
  overrides: Partial<ExistingVocabularyState> = {},
): ExistingVocabularyState {
  return {
    id: "vocab-1",
    arabic: "حرّك",
    transliteration: null,
    part_of_speech: "verb",
    notes: null,
    root: null,
    present: null,
    plural: null,
    glosses: [{ gloss: "to move", lang: "en" }],
    tags: [],
    ...overrides,
  };
}

function incoming(
  overrides: Partial<VocabularyWriteInput> = {},
): VocabularyWriteInput {
  return {
    arabic: "حرّك",
    part_of_speech: "verb",
    pairArabic: "يحرّك",
    senses: [{ gloss: "to move", lang: "en" }],
    tags: [],
    ...overrides,
  };
}

describe("planVocabEnrich", () => {
  it("fills absent present form", () => {
    const plan = planVocabEnrich(existing(), incoming());
    expect(plan.hasChanges).toBe(true);
    expect(plan.filledFields).toContain("present");
    expect(plan.patch.pairSlot).toBe("present_3ms");
    expect(plan.patch.pairArabic).toBe("يحرّك");
  });

  it("does not overwrite existing present", () => {
    const plan = planVocabEnrich(
      existing({ present: "بيحرّك" }),
      incoming({ pairArabic: "يحرّك" }),
    );
    expect(plan.filledFields).not.toContain("present");
    expect(plan.patch.pairArabic).toBeUndefined();
  });

  it("fills absent plural for nouns", () => {
    const plan = planVocabEnrich(
      existing({
        arabic: "كتاب",
        part_of_speech: "noun",
        present: null,
        plural: null,
        glosses: [{ gloss: "book", lang: "en" }],
      }),
      incoming({
        arabic: "كتاب",
        part_of_speech: "noun",
        pairArabic: "كتب",
        senses: [{ gloss: "book", lang: "en" }],
      }),
    );
    expect(plan.filledFields).toContain("plural");
    expect(plan.patch.pairSlot).toBe("plural");
    expect(plan.patch.pairArabic).toBe("كتب");
  });

  it("adds new glosses and tags only", () => {
    const plan = planVocabEnrich(
      existing({
        present: "يحرّك",
        glosses: [{ gloss: "to move", lang: "en" }],
        tags: ["verbs"],
      }),
      incoming({
        pairArabic: "يحرّك",
        senses: [
          { gloss: "to move", lang: "en" },
          { gloss: "to stir", lang: "en" },
        ],
        tags: ["verbs", "form-II"],
      }),
    );
    expect(plan.filledFields).toEqual(["glosses", "tags"]);
    expect(plan.patch.sensesToAdd).toEqual([
      { gloss: "to stir", lang: "en" },
    ]);
    expect(plan.patch.tags).toEqual(["verbs", "form-II"]);
  });

  it("returns no changes when nothing new", () => {
    const plan = planVocabEnrich(
      existing({
        present: "يحرّك",
        root: "ح ر ك",
        glosses: [{ gloss: "to move", lang: "en" }],
        tags: ["verbs"],
      }),
      incoming({
        pairArabic: "يحرّك",
        root: "ح ر ك",
        tags: ["verbs"],
      }),
    );
    expect(plan.hasChanges).toBe(false);
    expect(plan.filledFields).toEqual([]);
  });

  it("sets part_of_speech when absent then fills present", () => {
    const plan = planVocabEnrich(
      existing({ part_of_speech: null }),
      incoming(),
    );
    expect(plan.filledFields).toContain("part_of_speech");
    expect(plan.filledFields).toContain("present");
    expect(plan.patch.part_of_speech).toBe("verb");
  });
});
