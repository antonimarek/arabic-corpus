import { z } from "zod";

/**
 * Staging schema is richer than the canonical DB.
 * Future LLM extractors must emit this shape (or a strict subset).
 * // Future: ImportExtractionProvider.extract(raw) → ExtractedImport
 */

export const PARSER_VERSION = "1";

export type SourceRef = {
  type: string;
  file: string;
  importRunId: string;
  sheet?: string;
  deck?: string;
  row?: number;
  line?: number;
  noteId?: string;
  recordId?: string;
  extra?: Record<string, string | number | boolean | null>;
};

export type Gloss = {
  text: string;
  lang?: string;
  raw?: string;
};

export type ExtractionMeta = {
  method: "deterministic" | "llm";
  needsReview: boolean;
  parserVersion: string;
  model?: string;
};

export type MatchStatus =
  | "NEW"
  | "EXACT_DUPLICATE"
  | "POSSIBLE_DUPLICATE"
  | "MATCH_EXISTING"
  | "ERROR";

export type MatchInfo = {
  status: MatchStatus;
  existingId?: string;
  relatedStagingIds?: string[];
  score?: number;
  errors?: string[];
};

export type EntityHint =
  | "text"
  | "example"
  | "vocabulary"
  | "structure"
  | "unknown";

export type StagingCandidate = {
  stagingId: string;
  entityHint: EntityHint;
  original: {
    arabic?: string;
    fields: Record<string, unknown>;
  };
  normalized?: {
    arabic?: string;
    arabicSearch?: string;
    latinSearch?: string;
  };
  glosses: Gloss[];
  tags: string[];
  sources: SourceRef[];
  extraction: ExtractionMeta;
  fingerprint?: string;
  match: MatchInfo;
  lineRef?: { textStagingId?: string; line?: number };
  children?: StagingCandidate[];
};

export type ExtractedImport = {
  candidates: StagingCandidate[];
  rawParent?: StagingCandidate;
};

export const sourceRefSchema: z.ZodType<SourceRef> = z.object({
  type: z.string().min(1),
  file: z.string().min(1),
  importRunId: z.string().min(1),
  sheet: z.string().optional(),
  deck: z.string().optional(),
  row: z.number().int().positive().optional(),
  line: z.number().int().positive().optional(),
  noteId: z.string().optional(),
  recordId: z.string().optional(),
  extra: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export const glossSchema: z.ZodType<Gloss> = z.object({
  text: z.string(),
  lang: z.string().optional(),
  raw: z.string().optional(),
});

export const extractionMetaSchema: z.ZodType<ExtractionMeta> = z.object({
  method: z.enum(["deterministic", "llm"]),
  needsReview: z.boolean(),
  parserVersion: z.string().min(1),
  model: z.string().optional(),
});

export const matchStatusSchema = z.enum([
  "NEW",
  "EXACT_DUPLICATE",
  "POSSIBLE_DUPLICATE",
  "MATCH_EXISTING",
  "ERROR",
]);

export const matchInfoSchema: z.ZodType<MatchInfo> = z.object({
  status: matchStatusSchema,
  existingId: z.string().optional(),
  relatedStagingIds: z.array(z.string()).optional(),
  score: z.number().optional(),
  errors: z.array(z.string()).optional(),
});

export const entityHintSchema = z.enum([
  "text",
  "example",
  "vocabulary",
  "structure",
  "unknown",
]);

export const stagingCandidateSchema: z.ZodType<StagingCandidate> = z.lazy(() =>
  z.object({
    stagingId: z.string().min(1),
    entityHint: entityHintSchema,
    original: z.object({
      arabic: z.string().optional(),
      fields: z.record(z.string(), z.unknown()),
    }),
    normalized: z
      .object({
        arabic: z.string().optional(),
        arabicSearch: z.string().optional(),
        latinSearch: z.string().optional(),
      })
      .optional(),
    glosses: z.array(glossSchema),
    tags: z.array(z.string()),
    sources: z.array(sourceRefSchema).min(1),
    extraction: extractionMetaSchema,
    fingerprint: z.string().optional(),
    match: matchInfoSchema,
    lineRef: z
      .object({
        textStagingId: z.string().optional(),
        line: z.number().int().positive().optional(),
      })
      .optional(),
    children: z.array(stagingCandidateSchema).optional(),
  }),
);

export const extractedImportSchema: z.ZodType<ExtractedImport> = z.object({
  candidates: z.array(stagingCandidateSchema),
  rawParent: stagingCandidateSchema.optional(),
});

export const importRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);

export type ImportRunMeta = {
  importRunId: string;
  sourceFile: string;
  sourceType: string;
  fileHash: string;
  parserVersion: string;
  extractionMethod: "deterministic" | "llm";
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  recordCounts: {
    input: number;
    NEW: number;
    EXACT_DUPLICATE: number;
    POSSIBLE_DUPLICATE: number;
    MATCH_EXISTING: number;
    ERROR: number;
    byEntity?: Record<string, number>;
  };
  errors: Array<{ message: string; row?: number; detail?: string }>;
  mappingConfigPath?: string;
};

export const importRunMetaSchema: z.ZodType<ImportRunMeta> = z.object({
  importRunId: z.string().min(1),
  sourceFile: z.string().min(1),
  sourceType: z.string().min(1),
  fileHash: z.string().min(1),
  parserVersion: z.string().min(1),
  extractionMethod: z.enum(["deterministic", "llm"]),
  startedAt: z.string().min(1),
  completedAt: z.string().optional(),
  status: importRunStatusSchema,
  recordCounts: z.object({
    input: z.number().int().nonnegative(),
    NEW: z.number().int().nonnegative(),
    EXACT_DUPLICATE: z.number().int().nonnegative(),
    POSSIBLE_DUPLICATE: z.number().int().nonnegative(),
    MATCH_EXISTING: z.number().int().nonnegative(),
    ERROR: z.number().int().nonnegative(),
    byEntity: z.record(z.string(), z.number().int().nonnegative()).optional(),
  }),
  errors: z.array(
    z.object({
      message: z.string(),
      row: z.number().int().positive().optional(),
      detail: z.string().optional(),
    }),
  ),
  mappingConfigPath: z.string().optional(),
});

export type ReviewDecision = "keep" | "duplicate" | "skip";

export type DecisionsFile = {
  importRunId: string;
  updatedAt: string;
  decisions: Record<
    string,
    { decision: ReviewDecision; updatedAt: string; note?: string }
  >;
};

export const reviewDecisionSchema = z.enum(["keep", "duplicate", "skip"]);

export const decisionsFileSchema: z.ZodType<DecisionsFile> = z.object({
  importRunId: z.string(),
  updatedAt: z.string(),
  decisions: z.record(
    z.string(),
    z.object({
      decision: reviewDecisionSchema,
      updatedAt: z.string(),
      note: z.string().optional(),
    }),
  ),
});

export function parseStagingCandidate(data: unknown): StagingCandidate {
  return stagingCandidateSchema.parse(data);
}

export function safeParseStagingCandidate(data: unknown) {
  return stagingCandidateSchema.safeParse(data);
}

export function parseExtractedImport(data: unknown): ExtractedImport {
  return extractedImportSchema.parse(data);
}

export function safeParseExtractedImport(data: unknown) {
  return extractedImportSchema.safeParse(data);
}
