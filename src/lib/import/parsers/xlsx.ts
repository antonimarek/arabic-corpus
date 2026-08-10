import * as XLSX from "xlsx";

import {
  cellString,
  loadMapping,
  parseTags,
  type ColumnMapping,
  type ParseError,
  type ParseResult,
} from "./mapping";

export function parseXlsxBuffer(
  buffer: Buffer,
  mappingRaw: unknown,
): ParseResult {
  const mapping = loadMapping(mappingRaw);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    return {
      rows: [],
      errors: [
        {
          message: "Failed to parse XLSX",
          detail: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }

  const sheetName =
    mapping.sheet && workbook.SheetNames.includes(mapping.sheet)
      ? mapping.sheet
      : workbook.SheetNames[0];

  if (!sheetName) {
    return {
      rows: [],
      errors: [{ message: "Workbook has no sheets" }],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rowsFromRecords(records, mapping, sheetName);
}

function rowsFromRecords(
  records: Record<string, unknown>[],
  mapping: ColumnMapping,
  sheet: string,
): ParseResult {
  const errors: ParseError[] = [];
  const rows: ParseResult["rows"] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
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

  return { rows, errors, sheet };
}
