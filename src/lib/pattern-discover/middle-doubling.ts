import { createHash } from "node:crypto";

import { normalizeArabic } from "@/lib/import/normalize";
import { rootsMatch } from "@/lib/option-filter";

export const MIDDLE_DOUBLING_DETECTOR_ID = "middle_doubling";
export const MIDDLE_DOUBLING_DETECTOR_VERSION = "1";

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

/**
 * True when derived looks like base with shadda on the middle radical.
 * Triliteral: shadda on index 1. Quad: shadda on index 1 or 2 (prefer middle).
 */
function isMiddleDoublingPair(
  base: Analyzed,
  derived: Analyzed,
): DoublingSignals | null {
  if (base.letters !== derived.letters) return null;
  if (base.id === derived.id) return null;

  const baseHas = base.shaddaIndexes.length > 0;
  const derivedHas = derived.shaddaIndexes.length > 0;
  if (baseHas || !derivedHas) return null;

  const len = derived.letters.length;
  const middle = Math.floor((len - 1) / 2);
  const middleDoubled = derived.shaddaIndexes.includes(middle);
  if (!middleDoubled && !(len === 3 && derived.shaddaIndexes.includes(1))) {
    return null;
  }

  const sameRoot = Boolean(
    base.root && derived.root && rootsMatch(base.root, derived.root),
  );

  const signals: DoublingSignals = {
    middle_doubled: true,
    same_skeleton: true,
    compatible_shapes: len >= 3 && len <= 4,
    same_root: sameRoot,
  };

  if (scoreConfidence(signals) === "low" && !signals.compatible_shapes) {
    return null;
  }

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

/** Connected components of pairs sharing vocabulary ids. */
export function clusterDoublingPairs(
  pairs: DoublingPairCandidate[],
): DoublingPairCandidate[][] {
  const parent = new Map<string, string>();
  function find(id: string): string {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const pair of pairs) {
    parent.set(pair.base.id, find(pair.base.id));
    parent.set(pair.derived.id, find(pair.derived.id));
    union(pair.base.id, pair.derived.id);
  }

  const clusters = new Map<string, DoublingPairCandidate[]>();
  for (const pair of pairs) {
    const root = find(pair.base.id);
    const list = clusters.get(root) ?? [];
    list.push(pair);
    clusters.set(root, list);
  }
  return [...clusters.values()];
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

export function draftsFromDoublingClusters(
  clusters: DoublingPairCandidate[][],
): SuggestionDraft[] {
  return clusters.map((cluster) => {
    const memberIds = [
      ...new Set(
        cluster.flatMap((pair) => [pair.base.id, pair.derived.id]),
      ),
    ].sort();
    const confidences = cluster.map((p) => p.confidence);
    const confidence: Confidence = confidences.includes("high")
      ? "high"
      : confidences.includes("medium")
        ? "medium"
        : "low";
    const signals = {
      middle_doubled: cluster.every((p) => p.signals.middle_doubled),
      same_skeleton: cluster.every((p) => p.signals.same_skeleton),
      compatible_shapes: cluster.some((p) => p.signals.compatible_shapes),
      same_root: cluster.some((p) => p.signals.same_root),
      pair_count: cluster.length,
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
      reasoning: cluster[0]?.reasoning ?? reasonFrom(signals),
      fingerprint: fingerprintForMembers(
        MIDDLE_DOUBLING_DETECTOR_ID,
        MIDDLE_DOUBLING_DETECTOR_VERSION,
        "middle_doubling",
        memberIds,
      ),
      source: "deterministic",
      payload: {
        pairs: cluster.map((pair) => ({
          base_id: pair.base.id,
          derived_id: pair.derived.id,
        })),
        member_ids: memberIds,
      },
    };
  });
}

export function discoverMiddleDoublingDrafts(
  vocab: DiscoverVocab[],
): SuggestionDraft[] {
  const pairs = findMiddleDoublingPairs(vocab);
  const clusters = clusterDoublingPairs(pairs);
  return draftsFromDoublingClusters(clusters);
}
