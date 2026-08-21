export const PATTERN_ROLES = ["base", "derived", "related"] as const;
export type PatternRole = (typeof PATTERN_ROLES)[number];

export const MASTERY_STATES = [
  "encountered",
  "recognize",
  "understand",
  "use",
] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

export const PATTERN_ROLE_LABEL: Record<PatternRole, string> = {
  base: "Base",
  derived: "Derived",
  related: "Related",
};

export const MASTERY_LABEL: Record<MasteryState, string> = {
  encountered: "Encountered",
  recognize: "Recognize",
  understand: "Understand",
  use: "Use",
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
  fallback: MasteryState = "encountered",
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

export type VocabOption = {
  id: string;
  arabic: string;
  hint?: string | null;
};

export type PatternPair = {
  baseId: string;
  derivedId: string;
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

/** Pair ids for edit-form prefills from linked members. */
export function memberPairs(members: PatternMember[]): PatternPair[] {
  const bases = members.filter((m) => m.role === "base");
  const derived = members.filter((m) => m.role === "derived");
  if (bases.length === 0 || derived.length === 0) {
    return [];
  }
  const baseId = bases[0].vocabularyId;
  return derived.slice(0, 5).map((row) => ({
    baseId,
    derivedId: row.vocabularyId,
  }));
}

export function parsePatternPairs(formData: FormData): {
  pairs: PatternPair[];
  error?: string;
} {
  const bases = formData.getAll("pair_base").map((v) => String(v).trim());
  const derived = formData.getAll("pair_derived").map((v) => String(v).trim());
  const len = Math.max(bases.length, derived.length);
  const pairs: PatternPair[] = [];

  for (let i = 0; i < len; i++) {
    const baseId = bases[i] ?? "";
    const derivedId = derived[i] ?? "";
    if (!baseId && !derivedId) continue;
    if (!baseId || !derivedId) {
      return {
        pairs: [],
        error: "Each example needs both a base word and a derived word.",
      };
    }
    if (baseId === derivedId) {
      return {
        pairs: [],
        error: "Base and derived must be different words.",
      };
    }
    pairs.push({ baseId, derivedId });
  }

  return { pairs };
}
