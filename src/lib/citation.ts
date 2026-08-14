import { phraseMatchKey } from "@/lib/match-arabic";

export const FORM_SLOTS = ["present_3ms", "plural"] as const;

export type FormSlot = (typeof FORM_SLOTS)[number];

export type PosKind = "verb" | "noun" | "other";

export function isFormSlot(value: string | null | undefined): value is FormSlot {
  return value === "present_3ms" || value === "plural";
}

export function posKind(partOfSpeech: string | null | undefined): PosKind {
  const value = partOfSpeech?.trim().toLowerCase() ?? "";
  if (value === "verb" || value.startsWith("verb")) return "verb";
  if (value === "noun" || value.startsWith("noun")) return "noun";
  return "other";
}

export function citationSlotForPos(
  partOfSpeech: string | null | undefined,
): FormSlot | null {
  const kind = posKind(partOfSpeech);
  if (kind === "verb") return "present_3ms";
  if (kind === "noun") return "plural";
  return null;
}

export function headwordLabel(kind: PosKind): string {
  if (kind === "verb") return "Past (he)";
  if (kind === "noun") return "Singular";
  return "Arabic";
}

export function pairLabel(kind: PosKind): string | null {
  if (kind === "verb") return "Present (he)";
  if (kind === "noun") return "Plural";
  return null;
}

export function citationArabic(
  forms: { arabic: string; slot?: string | null }[] | null | undefined,
  slot: FormSlot,
): string | null {
  const match = (forms ?? []).find((form) => form.slot === slot);
  const arabic = match?.arabic.trim();
  return arabic ? arabic : null;
}

export function extraForms<T extends { slot?: string | null }>(
  forms: T[] | null | undefined,
): T[] {
  return (forms ?? []).filter((form) => !isFormSlot(form.slot));
}

export function harakatOnlyDifference(left: string, right: string): boolean {
  const leftKey = phraseMatchKey(left);
  const rightKey = phraseMatchKey(right);
  return (
    leftKey != null &&
    leftKey === rightKey &&
    left.trim() !== right.trim()
  );
}

export function existingWordError(
  inputArabic: string,
  storedArabic: string,
): string {
  if (harakatOnlyDifference(inputArabic, storedArabic)) {
    return "Same word with or without vowel marks. Open the existing card.";
  }
  return "This word is already in the corpus. Open the existing card to add a sense.";
}
