const ARWORDS_SEARCH_BASE = "https://www.arwords.com/words/search";

/** Outbound lookup on Arabic Words (Lebanese / Levantine). No scrape. */
export function arwordsSearchUrl(phrase: string): string {
  const trimmed = phrase.trim();
  if (!trimmed) return "https://www.arwords.com/words";
  return `${ARWORDS_SEARCH_BASE}/${encodeURIComponent(trimmed)}`;
}
