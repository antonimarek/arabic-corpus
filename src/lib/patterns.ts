export const PATTERN_ROLES = ["base", "derived", "related"] as const;
export type PatternRole = (typeof PATTERN_ROLES)[number];

export const MASTERY_STATES = ["noticed", "recognizing", "using"] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

export const PATTERN_ROLE_LABEL: Record<PatternRole, string> = {
  base: "Base",
  derived: "Derived",
  related: "Related",
};

export const MASTERY_LABEL: Record<MasteryState, string> = {
  noticed: "Noticed",
  recognizing: "Recognizing",
  using: "Using",
};

export function isPatternRole(value: string): value is PatternRole {
  return (PATTERN_ROLES as readonly string[]).includes(value);
}

export function isMasteryState(value: string): value is MasteryState {
  return (MASTERY_STATES as readonly string[]).includes(value);
}

export function parsePatternRole(
  value: FormDataEntryValue | null,
  fallback: PatternRole = "related",
): PatternRole {
  const raw = String(value ?? "").trim();
  return isPatternRole(raw) ? raw : fallback;
}

export function parseMasteryState(
  value: FormDataEntryValue | null,
  fallback: MasteryState = "noticed",
): MasteryState {
  const raw = String(value ?? "").trim();
  return isMasteryState(raw) ? raw : fallback;
}

export type PatternMember = {
  vocabularyId: string;
  arabic: string;
  transliteration: string | null;
  gloss: string | null;
  role: PatternRole;
  root: string | null;
};

/** Build inductive pairs: each derived against first base when possible. */
export function inductivePairs(
  members: PatternMember[],
): { from: string; to: string }[] {
  const bases = members.filter((m) => m.role === "base");
  const derived = members.filter((m) => m.role === "derived");
  if (bases.length === 0 || derived.length === 0) {
    return [];
  }
  const baseArabic = bases[0].arabic;
  return derived.slice(0, 5).map((row) => ({
    from: baseArabic,
    to: row.arabic,
  }));
}
