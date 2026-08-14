import { describe, expect, it } from "vitest";

import {
  citationArabic,
  citationSlotForPos,
  existingWordError,
  extraForms,
  harakatOnlyDifference,
  headwordLabel,
  pairLabel,
  posKind,
} from "@/lib/citation";

describe("posKind", () => {
  it("maps verb and noun prefixes", () => {
    expect(posKind("verb")).toBe("verb");
    expect(posKind("Verb (hollow)")).toBe("verb");
    expect(posKind("noun")).toBe("noun");
    expect(posKind("particle")).toBe("other");
    expect(posKind(null)).toBe("other");
  });
});

describe("citation slots", () => {
  it("picks present for verbs and plural for nouns", () => {
    expect(citationSlotForPos("verb")).toBe("present_3ms");
    expect(citationSlotForPos("noun")).toBe("plural");
    expect(citationSlotForPos("particle")).toBeNull();
  });

  it("labels the citation pair", () => {
    expect(headwordLabel("verb")).toBe("Past (he)");
    expect(pairLabel("verb")).toBe("Present (he)");
    expect(headwordLabel("noun")).toBe("Singular");
    expect(pairLabel("noun")).toBe("Plural");
    expect(pairLabel("other")).toBeNull();
  });

  it("reads the citation form and leaves extra surfaces unlabeled", () => {
    const forms = [
      { id: "1", arabic: "بكتب", slot: "present_3ms" },
      { id: "2", arabic: "كتبوا", slot: null },
    ];
    expect(citationArabic(forms, "present_3ms")).toBe("بكتب");
    expect(extraForms(forms).map((form) => form.arabic)).toEqual(["كتبوا"]);
  });
});

describe("harakat identity", () => {
  it("treats vocalized and plain as the same letters", () => {
    expect(harakatOnlyDifference("كَتَب", "كتب")).toBe(true);
    expect(harakatOnlyDifference("كتب", "كتب")).toBe(false);
    expect(harakatOnlyDifference("كتب", "كتاب")).toBe(false);
  });

  it("explains a harakat collision", () => {
    expect(existingWordError("كَتَب", "كتب")).toMatch(/vowel marks/);
    expect(existingWordError("كتب", "كتب")).toMatch(/already in the corpus/);
  });
});
