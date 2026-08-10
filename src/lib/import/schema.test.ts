import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  safeParseExtractedImport,
  safeParseStagingCandidate,
} from "@/lib/import/schema";

const fixtures = path.join(process.cwd(), "import", "fixtures");

describe("staging schema fixtures", () => {
  it("validates Anki example fixture", () => {
    const raw = JSON.parse(
      readFileSync(path.join(fixtures, "anki-example.json"), "utf8"),
    );
    const result = safeParseStagingCandidate(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.original.arabic).toBe("شو عم تعمل؟");
      expect(result.data.glosses).toHaveLength(2);
      expect(result.data.sources[0].type).toBe("anki");
    }
  });

  it("validates XLSX vocab fixture with unsplit gloss", () => {
    const raw = JSON.parse(
      readFileSync(path.join(fixtures, "xlsx-vocab.json"), "utf8"),
    );
    const result = safeParseStagingCandidate(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extraction.needsReview).toBe(true);
      expect(result.data.glosses[0].raw).toContain("/");
    }
  });

  it("validates future messy ExtractedImport target", () => {
    const raw = JSON.parse(
      readFileSync(path.join(fixtures, "messy-extracted-target.json"), "utf8"),
    );
    const result = safeParseExtractedImport(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(3);
      expect(result.data.rawParent?.extraction.method).toBe("llm");
    }
  });

  it("rejects malformed LLM-shaped payload", () => {
    const result = safeParseExtractedImport({
      candidates: [{ stagingId: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
