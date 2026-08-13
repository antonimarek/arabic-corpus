import { normalizeArabic } from "@/lib/import/normalize";
import { phraseSearchKey } from "@/lib/lookup-phrase";

export type FilterOption = {
  label: string;
  hint?: string | null;
};

export function optionMatchesQuery(
  option: FilterOption,
  query: string,
): boolean {
  const needle = query.trim();
  if (!needle) return true;
  const hay = `${option.label} ${option.hint ?? ""}`;
  if (hay.toLowerCase().includes(needle.toLowerCase())) return true;
  const hayKey = normalizeArabic(hay) ?? "";
  const needleKey = phraseSearchKey(needle);
  return Boolean(needleKey && hayKey.includes(needleKey));
}

export function rootsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = phraseSearchKey(left ?? "");
  const b = phraseSearchKey(right ?? "");
  return a != null && a === b;
}
