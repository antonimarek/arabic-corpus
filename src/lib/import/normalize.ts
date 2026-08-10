/**
 * TypeScript port of Postgres normalize_arabic / normalize_latin
 * from supabase/migrations/20260809120000_search_intelligence.sql
 *
 * Must stay semantically compatible with the SQL implementations.
 * Do not change Postgres search behavior from here.
 */

/** Arabic diacritics + Quranic marks stripped by SQL regexp */
const ARABIC_DIACRITICS =
  /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/** SQL: translate(..., 'أإآٱةى', 'ااااهي') */
const ARABIC_LETTER_MAP: Record<string, string> = {
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  ة: "ه",
  ى: "ي",
};

export function normalizeArabic(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  const stripped = input.replace(ARABIC_DIACRITICS, "");
  let mapped = "";
  for (const ch of stripped) {
    mapped += ARABIC_LETTER_MAP[ch] ?? ch;
  }
  return mapped.toLowerCase();
}

export function normalizeLatin(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}
