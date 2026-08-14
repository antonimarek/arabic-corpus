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

/** Longest first. `ت` only when the remainder has at least 3 letters. */
const PERSON_SUFFIXES = ["وا", "ون", "ين", "نا"];

export function peelPersonSuffix(normalized: string): string | null {
  for (const suffix of PERSON_SUFFIXES) {
    if (
      normalized.endsWith(suffix) &&
      normalized.length - suffix.length >= 2
    ) {
      return normalized.slice(0, -suffix.length);
    }
  }
  if (normalized.endsWith("ت") && normalized.length - 1 >= 3) {
    return normalized.slice(0, -1);
  }
  return null;
}

export function matchKeysForNormalized(normalized: string): string[] {
  const keys = new Set<string>([normalized]);
  const clitic = peelClitic(normalized);
  if (clitic) keys.add(clitic);
  const person = peelPersonSuffix(normalized);
  if (person) keys.add(person);
  if (clitic) {
    const afterPerson = peelPersonSuffix(clitic);
    if (afterPerson) keys.add(afterPerson);
  }
  if (person) {
    const afterClitic = peelClitic(person);
    if (afterClitic) keys.add(afterClitic);
  }
  return [...keys];
}

export function lookupKeysForSurface(surface: string): string[] {
  const key = phraseMatchKey(surface);
  if (!key) return [];
  return matchKeysForNormalized(key);
}
