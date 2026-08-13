import { normalizeArabic } from "@/lib/import/normalize";

/** Longest first. One layer only. */
const PROCLITICS = ["ال", "و", "ب", "ل", "ه", "ف", "ك", "ع"];
const ENCLITICS = ["هم", "هن", "ها", "نا", "كن", "كم", "ي", "ك", "ه"];

const TOKEN_RE = /[^\s\u00a0،؛؟!.…«»"'()[\]:,]+/g;

export type ArabicToken = {
  surface: string;
  start: number;
  end: number;
  key: string | null;
};

export function collapseArabicSpaces(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function phraseMatchKey(input: string): string | null {
  const collapsed = collapseArabicSpaces(input);
  if (!collapsed) return null;
  const key = normalizeArabic(collapsed);
  if (!key) return null;
  return key;
}

export function tokenizeArabic(text: string): ArabicToken[] {
  const tokens: ArabicToken[] = [];
  const re = new RegExp(TOKEN_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const surface = match[0];
    tokens.push({
      surface,
      start: match.index,
      end: match.index + surface.length,
      key: phraseMatchKey(surface),
    });
  }
  return tokens;
}

export function peelClitic(normalized: string): string | null {
  if (normalized.length < 3) return null;
  for (const prefix of PROCLITICS) {
    if (
      normalized.startsWith(prefix) &&
      normalized.length - prefix.length >= 2
    ) {
      return normalized.slice(prefix.length);
    }
  }
  for (const suffix of ENCLITICS) {
    if (
      normalized.endsWith(suffix) &&
      normalized.length - suffix.length >= 2
    ) {
      return normalized.slice(0, -suffix.length);
    }
  }
  return null;
}

export function lookupKeysForSurface(surface: string): string[] {
  const key = phraseMatchKey(surface);
  if (!key) return [];
  const keys = [key];
  const peeled = peelClitic(key);
  if (peeled && peeled !== key) {
    keys.push(peeled);
  }
  return keys;
}
