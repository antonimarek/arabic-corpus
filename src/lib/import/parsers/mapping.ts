import type { EntityHint } from "../schema";

export type ColumnMapping = {
  arabic: string;
  translation?: string;
  tags?: string;
  notes?: string;
  deck?: string;
  noteId?: string;
  transliteration?: string;
  entityHint?: EntityHint;
  sheet?: string | null;
  /** Split translation cell into multiple glosses; null = keep whole cell */
  splitGlossesOn?: string | null;
};

export function loadMapping(raw: unknown): ColumnMapping {
  if (!raw || typeof raw !== "object") {
    throw new Error("Mapping config must be an object.");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.arabic !== "string" || !obj.arabic.trim()) {
    throw new Error('Mapping config requires string field "arabic".');
  }
  return {
    arabic: obj.arabic,
    translation:
      typeof obj.translation === "string" ? obj.translation : undefined,
    tags: typeof obj.tags === "string" ? obj.tags : undefined,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
    deck: typeof obj.deck === "string" ? obj.deck : undefined,
    noteId: typeof obj.noteId === "string" ? obj.noteId : undefined,
    transliteration:
      typeof obj.transliteration === "string" ? obj.transliteration : undefined,
    entityHint:
      obj.entityHint === "text" ||
      obj.entityHint === "example" ||
      obj.entityHint === "vocabulary" ||
      obj.entityHint === "structure" ||
      obj.entityHint === "unknown"
        ? obj.entityHint
        : "example",
    sheet: obj.sheet === null || typeof obj.sheet === "string" ? obj.sheet : null,
    splitGlossesOn:
      obj.splitGlossesOn === null || typeof obj.splitGlossesOn === "string"
        ? obj.splitGlossesOn
        : null,
  };
}

export function cellString(
  row: Record<string, unknown>,
  column: string | undefined,
): string | undefined {
  if (!column) return undefined;
  const value = row[column];
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function splitGlosses(
  translation: string | undefined,
  splitOn: string | null | undefined,
): { text: string; raw?: string }[] {
  if (!translation) return [];
  if (!splitOn) {
    return [{ text: translation, raw: translation }];
  }
  return translation
    .split(splitOn)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export type ParseError = {
  message: string;
  row?: number;
  detail?: string;
};

export type ParseResult = {
  rows: Array<{
    rowNumber: number;
    fields: Record<string, unknown>;
    arabic?: string;
    translation?: string;
    tags: string[];
    notes?: string;
    deck?: string;
    noteId?: string;
    transliteration?: string;
  }>;
  errors: ParseError[];
  sheet?: string;
};
