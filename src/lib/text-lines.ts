/** Split stored arabic on newlines. Empty lines kept for stable numbering. */
export function splitTextLines(arabic: string): string[] {
  return arabic.split("\n");
}

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
