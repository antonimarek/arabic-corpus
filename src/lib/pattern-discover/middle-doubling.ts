import { createHash } from "node:crypto";

import { normalizeArabic } from "@/lib/import/normalize";
import { rootsMatch } from "@/lib/option-filter";

export const MIDDLE_DOUBLING_DETECTOR_ID = "middle_doubling";
export const MIDDLE_DOUBLING_DETECTOR_VERSION = "2";

/** Minimum independent pairs sharing this transform before a suggestion. */
export const MIN_INDEPENDENT_PAIRS = 2;

const SHADDA = "\u0651";
/** Strip harakat but keep letters + shadda for analysis. */
const STRIP_EXCEPT_SHADDA = /[\u064B-\u0650\u0652-\u065F\u0670\u06D6-\u06ED]/g;

export type DiscoverVocab = {
  id: string;
  arabic: string;
  root: string | null;
  gloss: string | null;
};

export type DoublingSignals = {
  middle_doubled: boolean;
  same_skeleton: boolean;
  compatible_shapes: boolean;
  same_root: boolean;
};

export type Confidence = "low" | "medium" | "high";

export type DoublingPairCandidate = {
  base: DiscoverVocab;
  derived: DiscoverVocab;
  signals: DoublingSignals;
  confidence: Confidence;
  reasoning: string;
};

export type SuggestionDraft = {
  detector_id: string;
  detector_version: string;
  name: string;
  arabic_sketch: string;
  form_label: string;
  cue: string;
  meaning_shift: string;
  confidence: Confidence;
  signals: DoublingSignals & { pair_count: number };
  reasoning: string;
  fingerprint: string;
  source: "deterministic";
  payload: {
    pairs: { base_id: string; derived_id: string }[];
    member_ids: string[];
  };
};

export type DiscoverStats = {
  pairsFound: number;
  unpairedFormIiLike: number;
};

type Analyzed = DiscoverVocab & {
  letters: string;
  shaddaIndexes: number[];
};

function analyze(vocab: DiscoverVocab): Analyzed | null {
  const kept = vocab.arabic.replace(STRIP_EXCEPT_SHADDA, "");
  const letters: string[] = [];
  const shaddaIndexes: number[] = [];
  for (let i = 0; i < kept.length; i++) {
    const ch = kept[i];
    if (ch === SHADDA) continue;
    if (!/[\u0600-\u06FF]/.test(ch)) continue;
    const mapped = normalizeArabic(ch) ?? ch;
    const letterIndex = letters.length;
    letters.push(mapped);
    if (kept[i + 1] === SHADDA) {
      shaddaIndexes.push(letterIndex);
    }
  }
  if (letters.length < 3 || letters.length > 6) return null;
  return {
    ...vocab,
    letters: letters.join(""),
    shaddaIndexes,
  };
}

function scoreConfidence(signals: DoublingSignals): Confidence {
  if (!signals.middle_doubled || !signals.same_skeleton) return "low";
  if (signals.same_root && signals.compatible_shapes) return "high";
  if (signals.compatible_shapes) return "medium";
  return "low";
}

function reasonFrom(signals: DoublingSignals): string {
  const bits: string[] = [];
  if (signals.middle_doubled) bits.push("middle consonant doubled (shadda)");
  if (signals.same_skeleton) bits.push("same consonant skeleton");
  if (signals.compatible_shapes) bits.push("compatible surface shapes");
  if (signals.same_root) bits.push("same root field");
  return bits.join("; ") || "weak signals";
}

/** Normalized letter skeletons that look Form-II-like but are not verb Form II. */
const DENIED_SKELETONS = new Set(["اول", "جوا", "برا"]);

/**
 * Reject common Levantine non-Form-II shadda surfaces.
 * Final ا with middle shadda (جوّا، برّا), multi-shadda nouns, and known non-verbs.
 */
export function isDeniedDerivedSurface(row: Analyzed): boolean {
  if (row.shaddaIndexes.length > 1) return true;
  if (DENIED_SKELETONS.has(row.letters)) return true;
  const last = row.letters[row.letters.length - 1];
  if (last === "ا" && row.shaddaIndexes.length === 1) return true;
  return false;
}

/**
 * Candidate Form II surface: triliteral, exactly one shadda on radical index 1.
 * Used for pair matching and unpaired diagnostics — not for suggestions alone.
 */
export function isFormIiLikeSurface(row: Analyzed): boolean {
  if (isDeniedDerivedSurface(row)) return false;
  if (row.letters.length !== 3) return false;
  if (row.shaddaIndexes.length !== 1) return false;
  return row.shaddaIndexes[0] === 1;
}

/**
 * True when derived looks like base with shadda on the middle radical.
 * Both words must already be in vocabulary (caller groups by skeleton).
 */
function isMiddleDoublingPair(
  base: Analyzed,
  derived: Analyzed,
): DoublingSignals | null {
  if (base.letters !== derived.letters) return null;
  if (base.id === derived.id) return null;

  const baseHas = base.shaddaIndexes.length > 0;
  if (baseHas) return null;
  if (!isFormIiLikeSurface(derived)) return null;

  const len = derived.letters.length;
  const sameRoot = Boolean(
    base.root && derived.root && rootsMatch(base.root, derived.root),
  );

  const signals: DoublingSignals = {
    middle_doubled: true,
    same_skeleton: true,
    compatible_shapes: len >= 3 && len <= 4,
    same_root: sameRoot,
  };

  if (scoreConfidence(signals) === "low") return null;

  return signals;
}

export function findMiddleDoublingPairs(
  vocab: DiscoverVocab[],
): DoublingPairCandidate[] {
  const analyzed = vocab
    .map(analyze)
    .filter((row): row is Analyzed => row != null);

  const byLetters = new Map<string, Analyzed[]>();
  for (const row of analyzed) {
    const list = byLetters.get(row.letters) ?? [];
    list.push(row);
    byLetters.set(row.letters, list);
  }

  const out: DoublingPairCandidate[] = [];
  const seen = new Set<string>();

  for (const group of byLetters.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = 0; j < group.length; j++) {
        if (i === j) continue;
        const base = group[i];
        const derived = group[j];
        const signals = isMiddleDoublingPair(base, derived);
        if (!signals) continue;
        const confidence = scoreConfidence(signals);
        if (confidence === "low") continue;
        const key = [base.id, derived.id].sort().join(":");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          base,
          derived,
          signals,
          confidence,
          reasoning: reasonFrom(signals),
        });
      }
    }
  }

  return out;
}

/** Count Form-II-like surfaces that are not the derived side of any pair. */
export function countUnpairedFormIiLike(
  vocab: DiscoverVocab[],
  pairs: DoublingPairCandidate[],
): number {
  const pairedDerived = new Set(pairs.map((pair) => pair.derived.id));
  return vocab
    .map(analyze)
    .filter((row): row is Analyzed => row != null)
    .filter((row) => isFormIiLikeSurface(row) && !pairedDerived.has(row.id))
    .length;
}

export function fingerprintForMembers(
  detectorId: string,
  detectorVersion: string,
  transformKey: string,
  memberIds: string[],
): string {
  const sorted = [...memberIds].sort().join(",");
  return createHash("sha256")
    .update(`${detectorId}|${detectorVersion}|${transformKey}|${sorted}`)
    .digest("hex");
}

function draftFromPairs(pairs: DoublingPairCandidate[]): SuggestionDraft {
  const memberIds = [
    ...new Set(pairs.flatMap((pair) => [pair.base.id, pair.derived.id])),
  ].sort();
  const confidences = pairs.map((p) => p.confidence);
  const confidence: Confidence = confidences.includes("high")
    ? "high"
    : confidences.includes("medium")
      ? "medium"
      : "low";
  const signals = {
    middle_doubled: pairs.every((p) => p.signals.middle_doubled),
    same_skeleton: pairs.every((p) => p.signals.same_skeleton),
    compatible_shapes: pairs.some((p) => p.signals.compatible_shapes),
    same_root: pairs.some((p) => p.signals.same_root),
    pair_count: pairs.length,
  };
  return {
    detector_id: MIDDLE_DOUBLING_DETECTOR_ID,
    detector_version: MIDDLE_DOUBLING_DETECTOR_VERSION,
    name: "Double middle",
    arabic_sketch: "فَعَل → فَعَّل",
    form_label: "II",
    cue: "Shadda on the middle consonant",
    meaning_shift:
      "Often causes, intensifies, or changes who the action affects.",
    confidence,
    signals,
    reasoning: `${pairs.length} independent pairs; ${pairs[0]?.reasoning ?? reasonFrom(signals)}`,
    fingerprint: fingerprintForMembers(
      MIDDLE_DOUBLING_DETECTOR_ID,
      MIDDLE_DOUBLING_DETECTOR_VERSION,
      "middle_doubling",
      memberIds,
    ),
    source: "deterministic",
    payload: {
      pairs: pairs.map((pair) => ({
        base_id: pair.base.id,
        derived_id: pair.derived.id,
      })),
      member_ids: memberIds,
    },
  };
}

/**
 * Pair-first discovery: suggest only when ≥2 independent vocabulary relationships
 * share the middle-doubling transform. Surface Form-II resemblance alone never
 * creates a suggestion.
 */
export function discoverMiddleDoublingDrafts(
  vocab: DiscoverVocab[],
): SuggestionDraft[] {
  const pairs = findMiddleDoublingPairs(vocab);
  if (pairs.length < MIN_INDEPENDENT_PAIRS) return [];
  return [draftFromPairs(pairs)];
}

export function discoverMiddleDoublingWithStats(vocab: DiscoverVocab[]): {
  drafts: SuggestionDraft[];
  stats: DiscoverStats;
} {
  const pairs = findMiddleDoublingPairs(vocab);
  const drafts =
    pairs.length >= MIN_INDEPENDENT_PAIRS ? [draftFromPairs(pairs)] : [];
  return {
    drafts,
    stats: {
      pairsFound: pairs.length,
      unpairedFormIiLike: countUnpairedFormIiLike(vocab, pairs),
    },
  };
}
