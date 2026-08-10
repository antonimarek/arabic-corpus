import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseAnkiCsvContent, parseCsvContent } from "@/lib/import/parsers/csv";
import { runImport } from "@/lib/import/pipeline";
import { createFilesystemStagingStore } from "@/lib/import/staging";

const mapping = {
  arabic: "Arabic",
  translation: "Translation",
  tags: "Tags",
  entityHint: "example",
  splitGlossesOn: "\n",
};

describe("csv parser", () => {
  it("parses rows and reports missing arabic", () => {
    const csv = `Arabic,Translation,Tags
شو عم تعمل؟,What are you doing?,verbs
,missing arabic,x
مرحبا,hello,greet
`;
    const result = parseCsvContent(csv, mapping);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("allows missing translation", () => {
    const csv = `Arabic,Translation
مبارح,
`;
    const result = parseCsvContent(csv, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].translation).toBeUndefined();
  });
});

describe("anki csv parser", () => {
  it("maps front/back/tags/deck", () => {
    const csv = `Front,Back,Tags,Deck,Guid
شو عم تعمل؟,"What are you doing?
What are you up to?",verbs,Levantine,note-1
`;
    const result = parseAnkiCsvContent(csv, {
      arabic: "Front",
      translation: "Back",
      tags: "Tags",
      deck: "Deck",
      noteId: "Guid",
      entityHint: "example",
      splitGlossesOn: "\n",
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].deck).toBe("Levantine");
    expect(result.rows[0].noteId).toBe("note-1");
  });
});

describe("runImport idempotency", () => {
  it("rewrites same staging run id for identical file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "import-stage-"));
    try {
      const store = createFilesystemStagingStore(dir);
      const content = Buffer.from(
        `Arabic,Translation\nشو عم تعمل؟,What?\n`,
        "utf8",
      );
      const first = await runImport({
        filePath: "raw/test.csv",
        fileName: "raw/test.csv",
        content,
        sourceType: "csv",
        mapping,
        store,
        writeReports: false,
      });
      const second = await runImport({
        filePath: "raw/test.csv",
        fileName: "raw/test.csv",
        content,
        sourceType: "csv",
        mapping,
        store,
        writeReports: false,
      });
      expect(first.meta.importRunId).toBe(second.meta.importRunId);
      const candidates = await store.getCandidates(first.meta.importRunId);
      expect(candidates).toHaveLength(1);

      const runJson = await readFile(
        path.join(dir, first.meta.importRunId, "run.json"),
        "utf8",
      );
      expect(JSON.parse(runJson).fileHash).toBe(first.meta.fileHash);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
