import { describe, expect, it } from "vitest";

import { mapImportItem } from "@/lib/corpus/map-bundle";

describe("mapImportItem", () => {
  it("maps vocabulary columns", () => {
    const mapped = mapImportItem({
      type: "vocabulary",
      arabic: "مبارح",
      glosses: [{ text: "yesterday", lang: "en" }],
      transliteration: "mbarreh",
      part_of_speech: "adv",
      root: "برح",
      notes: "time word",
      tags: ["time", "time"],
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.type).toBe("vocabulary");
    if (mapped.type !== "vocabulary") return;
    expect(mapped.input.arabic).toBe("مبارح");
    expect(mapped.input.senses).toEqual([{ gloss: "yesterday", lang: "en" }]);
    expect(mapped.input.transliteration).toBe("mbarreh");
    expect(mapped.input.part_of_speech).toBe("adv");
    expect(mapped.input.root).toBe("برح");
    expect(mapped.input.notes).toBe("time word");
    expect(mapped.input.tags).toEqual(["time"]);
    expect(mapped.input.pairArabic).toBeNull();
  });

  it("maps verb present and noun plural citation fields", () => {
    const verb = mapImportItem({
      type: "vocabulary",
      arabic: "كتب",
      glosses: [{ text: "write", lang: "en" }],
      part_of_speech: "verb",
      present: "بكتب",
    });
    expect("error" in verb).toBe(false);
    if ("error" in verb || verb.type !== "vocabulary") return;
    expect(verb.input.pairArabic).toBe("بكتب");

    const noun = mapImportItem({
      type: "vocabulary",
      arabic: "كتاب",
      glosses: [{ text: "book", lang: "en" }],
      part_of_speech: "noun",
      plural: "كتب",
    });
    expect("error" in noun).toBe(false);
    if ("error" in noun || noun.type !== "vocabulary") return;
    expect(noun.input.pairArabic).toBe("كتب");
  });

  it("maps example columns", () => {
    const mapped = mapImportItem({
      type: "example",
      arabic: "شو كنت عم تعمل؟",
      translation: "What were you doing?",
      transliteration: "shu kint am ta'mil",
      tags: ["past"],
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.type).toBe("example");
    if (mapped.type !== "example") return;
    expect(mapped.input.arabic).toBe("شو كنت عم تعمل؟");
    expect(mapped.input.translation).toBe("What were you doing?");
    expect(mapped.input.transliteration).toBe("shu kint am ta'mil");
    expect(mapped.input.tags).toEqual(["past"]);
  });

  it("maps structure columns", () => {
    const mapped = mapImportItem({
      type: "structure",
      name: "كنت عم + verb",
      arabic_form: "كنت عم",
      meaning: "ongoing past",
      explanation: "past continuous",
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.type).toBe("structure");
    if (mapped.type !== "structure") return;
    expect(mapped.input.name).toBe("كنت عم + verb");
    expect(mapped.input.arabic_form).toBe("كنت عم");
    expect(mapped.input.meaning).toBe("ongoing past");
    expect(mapped.input.explanation).toBe("past continuous");
  });

  it("maps text columns", () => {
    const mapped = mapImportItem({
      type: "text",
      title: "Lesson 42",
      arabic: "اليوم حكينا عن السفر.",
      translation: "Today we talked about travel.",
      source: "class",
      occurred_on: "2026-08-01",
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.type).toBe("text");
    if (mapped.type !== "text") return;
    expect(mapped.input.title).toBe("Lesson 42");
    expect(mapped.input.arabic).toBe("اليوم حكينا عن السفر.");
    expect(mapped.input.translation).toBe("Today we talked about travel.");
    expect(mapped.input.source).toBe("class");
    expect(mapped.input.occurred_on).toBe("2026-08-01");
  });

  it("uses translation as a vocab gloss fallback", () => {
    const mapped = mapImportItem({
      type: "vocabulary",
      arabic: "هلق",
      translation: "now",
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    if (mapped.type !== "vocabulary") return;
    expect(mapped.input.senses).toEqual([{ gloss: "now", lang: "en" }]);
  });
});
