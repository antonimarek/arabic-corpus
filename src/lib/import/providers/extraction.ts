/**
 * Future messy-text / LLM extraction.
 *
 * This build does not implement providers or API calls.
 * Target output: ExtractedImport (see schema.ts).
 *
 * // Future: ImportExtractionProvider.extract(raw) → ExtractedImport
 */

import type { ExtractedImport } from "../schema";
import { extractedImportSchema } from "../schema";

export type ImportExtractionProvider = {
  readonly id: string;
  extract(input: string): Promise<ExtractedImport>;
};

/** Stub only — throws. Deterministic parsers are the path for this build. */
export class NoneImportExtractionProvider implements ImportExtractionProvider {
  readonly id = "none";

  async extract(_input: string): Promise<ExtractedImport> {
    throw new Error(
      "ImportExtractionProvider is none. Messy-text / LLM extraction is deferred. Use CSV/XLSX/Anki parsers.",
    );
  }
}

export function getImportExtractionProvider(): ImportExtractionProvider {
  return new NoneImportExtractionProvider();
}

export function validateExtractedImport(data: unknown): ExtractedImport {
  return extractedImportSchema.parse(data);
}
