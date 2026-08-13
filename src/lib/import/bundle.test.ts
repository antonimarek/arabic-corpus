import { describe, expect, it } from "vitest";

import {
  assessImportItem,
  IMPORT_PROMPTS,
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
      expect(result.bundle.items).toHaveLength(3);
      expect(result.bundle.version).toBe(1);
    }
  });

  it("accepts the prompt example bundle", () => {
    const result = parseImportBundle(JSON.stringify(PROMPT_EXAMPLE_BUNDLE));
    expect(result.ok).toBe(true);
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
});

describe("import prompts", () => {
  it("embeds the example bundle JSON", () => {
    for (const prompt of IMPORT_PROMPTS) {
      expect(prompt.text).toContain('"version": 1');
      expect(prompt.text).toContain("مبارح");
    }
  });
});
