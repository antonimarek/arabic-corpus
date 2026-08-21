import { describe, expect, it } from "vitest";

import {
  assessImportItem,
  citationWarning,
  IMPORT_PROMPTS,
  itemLabel,
  normalizeImportItem,
  parseImportBundle,
  PROMPT_EXAMPLE_BUNDLE,
} from "@/lib/import";

describe("parseImportBundle", () => {
  it("accepts fenced JSON", () => {
    const result = parseImportBundle(
      `\`\`\`json\n${JSON.stringify(PROMPT_EXAMPLE_BUNDLE)}\n\`\`\``,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.items).toHaveLength(5);
      expect(result.bundle.version).toBe(1);
    }
  });

  it("accepts the prompt example bundle", () => {
    const result = parseImportBundle(JSON.stringify(PROMPT_EXAMPLE_BUNDLE));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.source?.origin).toBe("lesson");
      expect(result.bundle.source?.value).toBe("high");
    }
  });

  it("accepts a bundle when a vocab item is missing a gloss", () => {
    const result = parseImportBundle(
      JSON.stringify({
        version: 1,
        items: [{ type: "vocabulary", arabic: "مبارح" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const assessment = assessImportItem(result.bundle.items[0]);
      expect(assessment.ok).toBe(false);
      if (!assessment.ok) {
        expect(assessment.error).toMatch(/gloss/i);
      }
    }
  });

  it("marks unknown type as invalid", () => {
    const result = parseImportBundle(
      JSON.stringify({
        version: 1,
        items: [{ type: "flashcard", arabic: "مرحبا" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const assessment = assessImportItem(result.bundle.items[0]);
      expect(assessment.ok).toBe(false);
      if (!assessment.ok) {
        expect(assessment.error).toMatch(/unknown type/i);
      }
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseImportBundle("not json");
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong version", () => {
    const result = parseImportBundle(
      JSON.stringify({ version: 2, items: [{ type: "example", arabic: "أهلا" }] }),
    );
    expect(result.ok).toBe(false);
  });

  it("splits a combined verb citation into past and present", () => {
    const result = parseImportBundle(
      JSON.stringify({
        version: 1,
        items: [
          {
            type: "vocabulary",
            arabic: "حرّك - يحرّك",
            glosses: [{ text: "move" }],
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.bundle.items[0];
    expect(item?.arabic).toBe("حرّك");
    expect(item?.present).toBe("يحرّك");
    expect(item?.part_of_speech).toBe("verb");
  });

  it("splits a combined noun citation into singular and plural", () => {
    const result = parseImportBundle(
      JSON.stringify({
        version: 1,
        items: [
          {
            type: "vocabulary",
            arabic: "كتاب / كتب",
            glosses: [{ text: "book" }],
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.bundle.items[0];
    expect(item?.arabic).toBe("كتاب");
    expect(item?.plural).toBe("كتب");
    expect(item?.part_of_speech).toBe("noun");
  });
});

describe("normalizeImportItem", () => {
  it("keeps an explicit other word unsplit", () => {
    const item = normalizeImportItem({
      type: "vocabulary",
      arabic: "مبارح",
      part_of_speech: "other",
      glosses: [{ text: "yesterday" }],
    });
    expect(item.arabic).toBe("مبارح");
    expect(item.present).toBeUndefined();
    expect(item.plural).toBeUndefined();
  });

  it("does not overwrite an explicit present field", () => {
    const item = normalizeImportItem({
      type: "vocabulary",
      arabic: "حرّك - يحرّك",
      present: "بيحرّك",
      part_of_speech: "verb",
      glosses: [{ text: "move" }],
    });
    expect(item.arabic).toBe("حرّك");
    expect(item.present).toBe("بيحرّك");
  });
});

describe("itemLabel and citationWarning", () => {
  it("joins verb past and present with a hyphen", () => {
    expect(
      itemLabel({
        type: "vocabulary",
        arabic: "حرّك",
        present: "يحرّك",
        part_of_speech: "verb",
      }),
    ).toBe("حرّك - يحرّك");
  });

  it("joins noun singular and plural with a hyphen", () => {
    expect(
      itemLabel({
        type: "vocabulary",
        arabic: "كتاب",
        plural: "كتب",
        part_of_speech: "noun",
      }),
    ).toBe("كتاب - كتب");
  });

  it("warns when a verb is missing present", () => {
    expect(
      citationWarning({
        type: "vocabulary",
        arabic: "حرّك",
        part_of_speech: "verb",
      }),
    ).toMatch(/present/i);
  });

  it("warns when a noun is missing plural", () => {
    expect(
      citationWarning({
        type: "vocabulary",
        arabic: "كتاب",
        part_of_speech: "noun",
      }),
    ).toMatch(/plural/i);
  });
});

describe("import prompts", () => {
  it("embeds the example bundle JSON", () => {
    for (const prompt of IMPORT_PROMPTS) {
      expect(prompt.text).toContain('"version": 1');
      expect(prompt.text).toContain("مبارح");
      expect(prompt.text).toContain("حرّك");
      expect(prompt.text).toContain("يحرّك");
      expect(prompt.text).toContain('"present"');
      expect(prompt.text).toContain('"plural"');
    }
  });

  it("requires both citation forms for verbs and nouns", () => {
    for (const prompt of IMPORT_PROMPTS) {
      expect(prompt.text).toMatch(/never leave present empty/i);
      expect(prompt.text).toMatch(/never leave plural empty/i);
      expect(prompt.text).toContain("source.origin");
    }
  });
});
