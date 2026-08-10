import { parse } from "csv-parse/sync";

import {
  cellString,
  loadMapping,
  parseTags,
  type ColumnMapping,
  type ParseError,
  type ParseResult,
} from "./mapping";

export function parseCsvContent(
  content: string,
  mappingRaw: unknown,
): ParseResult {
  const mapping = loadMapping(mappingRaw);
  return parseDelimitedRows(content, mapping, ",");
}

export function parseAnkiCsvContent(
  content: string,
  mappingRaw: unknown,
): ParseResult {
  const mapping = loadMapping(mappingRaw);
  // Anki exports often use tab or comma; detect tab if present in header line
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  return parseDelimitedRows(content, mapping, delimiter);
}

function parseDelimitedRows(
  content: string,
  mapping: ColumnMapping,
  delimiter: string,
): ParseResult {
  const errors: ParseError[] = [];
  let records: Record<string, unknown>[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
      delimiter,
      relax_quotes: true,
    }) as Record<string, unknown>[];
  } catch (err) {
    return {
      rows: [],
      errors: [
        {
          message: "Failed to parse CSV",
          detail: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }

  const rows: ParseResult["rows"] = [];
  records.forEach((record, index) => {
    const rowNumber = index + 2; // header is row 1
    const values = Object.values(record).map((v) =>
      v === null || v === undefined ? "" : String(v).trim(),
    );
    if (values.every((v) => v.length === 0)) {
      return;
    }

    const arabic = cellString(record, mapping.arabic);
    if (!arabic) {
      errors.push({
        message: `Missing arabic column "${mapping.arabic}"`,
        row: rowNumber,
      });
      return;
    }

    rows.push({
      rowNumber,
      fields: { ...record },
      arabic,
      translation: cellString(record, mapping.translation),
      tags: parseTags(cellString(record, mapping.tags)),
      notes: cellString(record, mapping.notes),
      deck: cellString(record, mapping.deck),
      noteId: cellString(record, mapping.noteId),
      transliteration: cellString(record, mapping.transliteration),
    });
  });

  return { rows, errors };
}
