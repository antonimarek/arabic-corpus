import { describe, expect, it } from "vitest";

import { buildPreviewRow } from "@/lib/import/preview";
import type { ExistingMatch } from "@/lib/import/match";

function vocabMatch(
  overrides: Partial<NonNullable<ExistingMatch["vocabulary"]>> = {},
): ExistingMatch {
  return {
    id: "existing-id",
    vocabulary: {
      id: "existing-id",
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
    },
  };
}

describe("buildPreviewRow", () => {
  it("keeps a valid new row", () => {
    const row = buildPreviewRow(
      0,
      {
        type: "example",
        arabic: "شو كنت عم تعمل؟",
        translation: "What were you doing?",
      },
      null,
    );
    expect(row.matchStatus).toBe("new");
    expect(row.defaultDecision).toBe("keep");
    expect(row.decision).toBe("keep");
  });

  it("skips an exact Arabic duplicate with no new fields", () => {
    const row = buildPreviewRow(
      1,
      {
        type: "vocabulary",
        arabic: "حرّك",
        part_of_speech: "verb",
        present: "يحرّك",
        glosses: [{ text: "to move" }],
      },
      vocabMatch({ present: "يحرّك" }),
    );
    expect(row.matchStatus).toBe("exact_duplicate");
    expect(row.defaultDecision).toBe("skip");
    expect(row.decision).toBe("skip");
    expect(row.existingId).toBe("existing-id");
    expect(row.existingHref).toBe("/vocabulary/existing-id");
  });

  it("keeps an enrichable duplicate that adds present", () => {
    const row = buildPreviewRow(
      1,
      {
        type: "vocabulary",
        arabic: "حرّك",
        part_of_speech: "verb",
        present: "يحرّك",
        glosses: [{ text: "to move" }],
      },
      vocabMatch({ present: null }),
    );
    expect(row.matchStatus).toBe("enrichable");
    expect(row.defaultDecision).toBe("keep");
    expect(row.decision).toBe("keep");
    expect(row.enrichFields).toContain("present");
    expect(row.existingId).toBe("existing-id");
  });

  it("skips an invalid row", () => {
    const row = buildPreviewRow(2, { type: "vocabulary", arabic: "مبارح" }, null);
    expect(row.matchStatus).toBe("invalid");
    expect(row.defaultDecision).toBe("skip");
    expect(row.decision).toBe("skip");
    expect(row.error).toMatch(/gloss/i);
  });

  it("honors a stored keep on a duplicate", () => {
    const row = buildPreviewRow(
      0,
      { type: "example", arabic: "مرحبا" },
      { id: "dup-id" },
      "keep",
    );
    expect(row.matchStatus).toBe("exact_duplicate");
    expect(row.defaultDecision).toBe("skip");
    expect(row.decision).toBe("keep");
  });
});
