import { describe, expect, it } from "vitest";

import {
  dedupeCandidates,
  loadExistingIndex,
  trigramSimilarity,
} from "@/lib/import/dedupe";
import { fingerprintArabic } from "@/lib/import/fingerprint";
import type { StagingCandidate } from "@/lib/import/schema";

function base(
  overrides: Partial<StagingCandidate> & {
    stagingId: string;
    arabic: string;
  },
): StagingCandidate {
  return {
    stagingId: overrides.stagingId,
    entityHint: overrides.entityHint ?? "example",
    original: {
      arabic: overrides.arabic,
      fields: overrides.original?.fields ?? { arabic: overrides.arabic },
    },
    glosses: overrides.glosses ?? [],
    tags: overrides.tags ?? [],
    sources: overrides.sources ?? [
      {
        type: "csv",
        file: "a.csv",
        row: 1,
        importRunId: "run1",
      },
    ],
    extraction: overrides.extraction ?? {
      method: "deterministic",
      needsReview: false,
      parserVersion: "1",
    },
    match: overrides.match ?? { status: "NEW" },
  };
}

describe("fingerprintArabic", () => {
  it("matches punctuation-normalized Arabic that normalize treats same", () => {
    // diacritics strip → same fingerprint
    expect(fingerprintArabic("مَرْحبا")).toBe(fingerprintArabic("مرحبا"));
  });

  it("keeps distinct when content differs", () => {
    expect(fingerprintArabic("شو عم تعمل؟")).not.toBe(
      fingerprintArabic("شو عم تعمل اليوم؟"),
    );
  });

  it("treats ؟ vs no ؟ as distinct (normalize keeps punctuation)", () => {
    expect(fingerprintArabic("شو عم تعمل؟")).not.toBe(
      fingerprintArabic("شو عم تعمل"),
    );
  });
});

describe("dedupeCandidates", () => {
  it("merges exact duplicates and unions glosses + sources", () => {
    const a = base({
      stagingId: "a",
      arabic: "شو عم تعمل؟",
      glosses: [{ text: "What are you doing?", lang: "en" }],
      sources: [
        { type: "anki", file: "anki.csv", row: 1, importRunId: "r1" },
      ],
    });
    const b = base({
      stagingId: "b",
      arabic: "شو عم تعمل؟",
      glosses: [{ text: "What are you up to?", lang: "en" }],
      sources: [
        { type: "xlsx", file: "ex.xlsx", sheet: "S", row: 2, importRunId: "r1" },
      ],
    });

    const out = dedupeCandidates([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].glosses).toHaveLength(2);
    expect(out[0].sources).toHaveLength(2);
    expect(out[0].match.relatedStagingIds).toContain("b");
    expect(out[0].original.arabic).toBe("شو عم تعمل؟");
  });

  it("flags near duplicates without merging", () => {
    const a = base({ stagingId: "a", arabic: "شو عم تعمل؟" });
    const b = base({ stagingId: "b", arabic: "شو عم تعمل هلق؟" });
    const out = dedupeCandidates([a, b], { nearDuplicateThreshold: 0.5 });
    expect(out).toHaveLength(2);
    const statuses = out.map((c) => c.match.status).sort();
    expect(statuses).toContain("NEW");
    expect(statuses).toContain("POSSIBLE_DUPLICATE");
  });

  it("keeps clearly distinct examples separate", () => {
    const a = base({ stagingId: "a", arabic: "مرحبا" });
    const b = base({ stagingId: "b", arabic: "كيفك" });
    const out = dedupeCandidates([a, b], { nearDuplicateThreshold: 0.9 });
    expect(out.every((c) => c.match.status === "NEW")).toBe(true);
  });

  it("matches existing corpus by fingerprint", () => {
    const fp = fingerprintArabic("مبارح");
    const index = loadExistingIndex([
      { id: "canon-1", fingerprint: fp, arabic: "مبارح" },
    ]);
    const out = dedupeCandidates(
      [base({ stagingId: "a", arabic: "مبارح" })],
      { existing: index },
    );
    expect(out[0].match.status).toBe("MATCH_EXISTING");
    expect(out[0].match.existingId).toBe("canon-1");
  });

  it("preserves original arabic exactly", () => {
    const original = "شو عم تعمل؟";
    const out = dedupeCandidates([
      base({ stagingId: "a", arabic: original }),
    ]);
    expect(out[0].original.arabic).toBe(original);
  });
});

describe("trigramSimilarity", () => {
  it("is 1 for identical strings", () => {
    expect(trigramSimilarity("abc", "abc")).toBe(1);
  });
});
