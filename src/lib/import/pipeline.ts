import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { dedupeCandidates, type ExistingCorpusIndex } from "./dedupe";
import { fileHash, makeStagingId } from "./fingerprint";
import { loadMapping, splitGlosses, type ColumnMapping } from "./parsers/mapping";
import { parseAnkiCsvContent, parseCsvContent } from "./parsers/csv";
import { parseXlsxBuffer } from "./parsers/xlsx";
import {
  PARSER_VERSION,
  type ImportRunMeta,
  type StagingCandidate,
} from "./schema";
import {
  createFilesystemStagingStore,
  defaultImportPaths,
  type StagingStore,
} from "./staging";

export type ImportSourceType = "csv" | "xlsx" | "anki-csv";

export type RunImportOptions = {
  filePath: string;
  fileName: string;
  content: Buffer;
  sourceType: ImportSourceType;
  mapping: unknown;
  mappingConfigPath?: string;
  importRunId?: string;
  store?: StagingStore;
  existing?: ExistingCorpusIndex;
  nearDuplicateThreshold?: number;
  writeReports?: boolean;
};

export type RunImportResult = {
  meta: ImportRunMeta;
  candidates: StagingCandidate[];
};

function buildCandidates(
  sourceType: ImportSourceType,
  fileName: string,
  fileHashValue: string,
  importRunId: string,
  mapping: ColumnMapping,
  parseResult: ReturnType<typeof parseCsvContent>,
): StagingCandidate[] {
  const shortHash = fileHashValue.slice(0, 12);
  return parseResult.rows.map((row) => {
    const glosses = splitGlosses(row.translation, mapping.splitGlossesOn);
    const needsReview =
      Boolean(row.translation) &&
      !mapping.splitGlossesOn &&
      /[\/|]/.test(row.translation ?? "");

    const stagingId = makeStagingId([
      mapping.entityHint ?? "example",
      sourceType,
      shortHash,
      parseResult.sheet ?? "default",
      row.rowNumber,
    ]);

    return {
      stagingId,
      entityHint: mapping.entityHint ?? "example",
      original: {
        arabic: row.arabic,
        fields: {
          ...row.fields,
          ...(row.notes ? { notes: row.notes } : {}),
          ...(row.transliteration
            ? { transliteration: row.transliteration }
            : {}),
        },
      },
      glosses,
      tags: row.tags,
      sources: [
        {
          type: sourceType === "anki-csv" ? "anki" : sourceType,
          file: fileName,
          importRunId,
          sheet: parseResult.sheet,
          deck: row.deck,
          row: row.rowNumber,
          noteId: row.noteId,
          recordId: row.noteId,
        },
      ],
      extraction: {
        method: "deterministic",
        needsReview,
        parserVersion: PARSER_VERSION,
      },
      match: { status: "NEW" },
    } satisfies StagingCandidate;
  });
}

function countStatuses(candidates: StagingCandidate[]): ImportRunMeta["recordCounts"] {
  const counts: ImportRunMeta["recordCounts"] = {
    input: candidates.length,
    NEW: 0,
    EXACT_DUPLICATE: 0,
    POSSIBLE_DUPLICATE: 0,
    MATCH_EXISTING: 0,
    ERROR: 0,
    byEntity: {},
  };
  for (const c of candidates) {
    if (c.match.status === "NEW") {
      counts.NEW += 1;
      const absorbed = c.match.relatedStagingIds?.length ?? 0;
      counts.EXACT_DUPLICATE += absorbed;
    } else {
      counts[c.match.status] += 1;
    }
    const hint = c.entityHint;
    counts.byEntity![hint] = (counts.byEntity![hint] ?? 0) + 1;
  }
  return counts;
}

export async function runImport(
  options: RunImportOptions,
): Promise<RunImportResult> {
  const startedAt = new Date().toISOString();
  const hash = fileHash(options.content);
  const importRunId =
    options.importRunId ?? `run_${hash.slice(0, 16)}_${options.sourceType}`;
  const mapping = loadMapping(options.mapping);
  const store = options.store ?? createFilesystemStagingStore();

  let parseResult;
  if (options.sourceType === "xlsx") {
    parseResult = parseXlsxBuffer(options.content, options.mapping);
  } else if (options.sourceType === "anki-csv") {
    parseResult = parseAnkiCsvContent(
      options.content.toString("utf8"),
      options.mapping,
    );
  } else {
    parseResult = parseCsvContent(
      options.content.toString("utf8"),
      options.mapping,
    );
  }

  const built = buildCandidates(
    options.sourceType,
    options.fileName,
    hash,
    importRunId,
    mapping,
    parseResult,
  );

  const candidates = dedupeCandidates(built, {
    existing: options.existing,
    nearDuplicateThreshold: options.nearDuplicateThreshold,
  });

  // Idempotent: same run id overwrites staging dir
  const meta: ImportRunMeta = {
    importRunId,
    sourceFile: options.fileName,
    sourceType: options.sourceType,
    fileHash: hash,
    parserVersion: PARSER_VERSION,
    extractionMethod: "deterministic",
    startedAt,
    completedAt: new Date().toISOString(),
    status: parseResult.errors.length > 0 && candidates.length === 0
      ? "failed"
      : "completed",
    recordCounts: {
      ...countStatuses(candidates),
      input: parseResult.rows.length + parseResult.errors.length,
    },
    errors: parseResult.errors,
    mappingConfigPath: options.mappingConfigPath,
  };

  // Adjust input count to raw parse rows + errors that skipped
  meta.recordCounts.input = parseResult.rows.length;

  await store.writeRun(meta, candidates);
  if (options.writeReports !== false) {
    await writeReports(meta, candidates);
  }

  return { meta, candidates };
}

async function writeReports(
  meta: ImportRunMeta,
  candidates: StagingCandidate[],
) {
  const paths = defaultImportPaths();
  const dir = path.join(paths.reports, meta.importRunId);
  await mkdir(dir, { recursive: true });

  const report = {
    ...meta,
    candidatesSample: candidates.slice(0, 5),
  };
  await writeFile(
    path.join(dir, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const md = [
    `# Import report: ${meta.importRunId}`,
    "",
    `- Source: \`${meta.sourceFile}\` (${meta.sourceType})`,
    `- File hash: \`${meta.fileHash}\``,
    `- Parser version: ${meta.parserVersion}`,
    `- Extraction: ${meta.extractionMethod}`,
    `- Status: ${meta.status}`,
    `- Started: ${meta.startedAt}`,
    `- Completed: ${meta.completedAt ?? ""}`,
    "",
    "## Counts",
    "",
    `- Input rows: ${meta.recordCounts.input}`,
    `- NEW: ${meta.recordCounts.NEW}`,
    `- EXACT_DUPLICATE: ${meta.recordCounts.EXACT_DUPLICATE}`,
    `- POSSIBLE_DUPLICATE: ${meta.recordCounts.POSSIBLE_DUPLICATE}`,
    `- MATCH_EXISTING: ${meta.recordCounts.MATCH_EXISTING}`,
    `- ERROR: ${meta.recordCounts.ERROR}`,
    "",
    "## By entity hint",
    "",
    ...Object.entries(meta.recordCounts.byEntity ?? {}).map(
      ([k, v]) => `- ${k}: ${v}`,
    ),
    "",
    "## Errors",
    "",
    meta.errors.length === 0
      ? "_None_"
      : meta.errors
          .map(
            (e) =>
              `- Row ${e.row ?? "?"}: ${e.message}${e.detail ? ` (${e.detail})` : ""}`,
          )
          .join("\n"),
    "",
  ].join("\n");

  await writeFile(path.join(dir, "report.md"), md, "utf8");
}
