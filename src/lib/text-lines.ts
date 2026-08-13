/** Split stored arabic on newlines. Empty lines kept for stable numbering. */
export function splitTextLines(arabic: string): string[] {
  return arabic.split("\n");
}

/**
 * One-shot edit helper: turn prose into study lines by inserting newlines
 * after sentence endings (. ۔ ؟ ! …) that are followed by whitespace.
 * Writes into stored text via the form — does not change line IDs by itself.
 */
export function breakTextIntoSentenceLines(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const result: string[] = [];
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/(?<=[.۔؟!…])\s+/u);
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence) result.push(sentence);
    }
  }
  return result.join("\n");
}

/** True when a one-shot sentence break would produce more non-empty lines. */
export function shouldOfferSentenceSplit(arabic: string): boolean {
  const nonEmpty = (value: string) =>
    splitTextLines(value).filter((line) => line.trim().length > 0).length;
  return nonEmpty(breakTextIntoSentenceLines(arabic)) > nonEmpty(arabic);
}

/** Hide in-text line filter until there are enough study lines to search. */
export const LINE_FILTER_MIN_LINES = 5;

/** 1-based line anchor used in URLs: /texts/[id]#line-N */
export function lineAnchorId(lineNumber: number): string {
  return `line-${lineNumber}`;
}

export function parseLineHash(hash: string): number | null {
  const match = /^#?line-(\d+)$/.exec(hash.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type TextLineRef = {
  textId: string;
  lineNumber: number;
};

export function textLineKey(ref: TextLineRef): string {
  return `${ref.textId}:${ref.lineNumber}`;
}

export function lineHref(textId: string, lineNumber: number): string {
  return `/texts/${textId}#${lineAnchorId(lineNumber)}`;
}

export type AlignedStudyLine = {
  arabic: string;
  translation: string | null;
};

/**
 * Zip Arabic lines with translation when non-empty counts match.
 * Empty Arabic lines keep their index and get no translation.
 */
export function alignTranslationLines(
  arabic: string,
  translation: string | null | undefined,
): { aligned: boolean; lines: AlignedStudyLine[] } {
  const arabicLines = splitTextLines(arabic);
  if (!translation?.trim()) {
    return {
      aligned: false,
      lines: arabicLines.map((line) => ({ arabic: line, translation: null })),
    };
  }

  const translationParts = splitTextLines(translation)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const arabicNonEmpty = arabicLines.filter((line) => line.trim().length > 0);

  if (
    arabicNonEmpty.length === 0 ||
    arabicNonEmpty.length !== translationParts.length
  ) {
    return {
      aligned: false,
      lines: arabicLines.map((line) => ({ arabic: line, translation: null })),
    };
  }

  let next = 0;
  const lines = arabicLines.map((line) => {
    if (!line.trim()) {
      return { arabic: line, translation: null };
    }
    const meaning = translationParts[next] ?? null;
    next += 1;
    return { arabic: line, translation: meaning };
  });

  return { aligned: true, lines };
}
