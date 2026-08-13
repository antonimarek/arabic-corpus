import { describe, expect, it } from "vitest";

import { buildPreviewRow } from "@/lib/import/preview";

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

  it("skips an exact Arabic duplicate", () => {
    const row = buildPreviewRow(
      1,
      {
        type: "vocabulary",
        arabic: "مبارح",
        glosses: [{ text: "yesterday" }],
      },
      "existing-id",
    );
    expect(row.matchStatus).toBe("exact_duplicate");
    expect(row.defaultDecision).toBe("skip");
    expect(row.decision).toBe("skip");
    expect(row.existingId).toBe("existing-id");
    expect(row.existingHref).toBe("/vocabulary/existing-id");
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
      "dup-id",
      "keep",
    );
    expect(row.matchStatus).toBe("exact_duplicate");
    expect(row.defaultDecision).toBe("skip");
    expect(row.decision).toBe("keep");
  });
});
