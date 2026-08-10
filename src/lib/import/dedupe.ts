import type { Gloss, SourceRef, StagingCandidate } from "./schema";
import { fingerprintArabic } from "./fingerprint";
import { normalizeArabic, normalizeLatin } from "./normalize";

export type ExistingCorpusEntry = {
  id: string;
  fingerprint: string;
  arabic?: string;
};

export type ExistingCorpusIndex = {
  byFingerprint: Map<string, ExistingCorpusEntry>;
};

export type DedupeOptions = {
  nearDuplicateThreshold?: number;
  existing?: ExistingCorpusIndex;
};

const DEFAULT_NEAR_THRESHOLD = 0.82;

function charNgrams(s: string, n = 3): Set<string> {
  const padded = `  ${s}  `;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - n; i += 1) {
    grams.add(padded.slice(i, i + n));
  }
  return grams;
}

/** Dice coefficient over character trigrams (0–1). */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const ga = charNgrams(a);
  const gb = charNgrams(b);
  let inter = 0;
  for (const g of ga) {
    if (gb.has(g)) inter += 1;
  }
  return (2 * inter) / (ga.size + gb.size);
}

function glossKey(g: Gloss): string {
  return `${g.lang ?? ""}::${g.text}`;
}

function mergeGlosses(a: Gloss[], b: Gloss[]): Gloss[] {
  const map = new Map<string, Gloss>();
  for (const g of [...a, ...b]) {
    map.set(glossKey(g), g);
  }
  return [...map.values()];
}

function sourceKey(s: SourceRef): string {
  return [
    s.type,
    s.file,
    s.sheet ?? "",
    s.deck ?? "",
    s.row ?? "",
    s.line ?? "",
    s.noteId ?? "",
    s.recordId ?? "",
  ].join("|");
}

function mergeSources(a: SourceRef[], b: SourceRef[]): SourceRef[] {
  const map = new Map<string, SourceRef>();
  for (const s of [...a, ...b]) {
    map.set(sourceKey(s), s);
  }
  return [...map.values()];
}

export function enrichCandidate(candidate: StagingCandidate): StagingCandidate {
  const arabic = candidate.original.arabic;
  if (!arabic) {
    return candidate;
  }
  const arabicSearch = normalizeArabic(arabic) ?? undefined;
  const latinParts = candidate.glosses.map((g) => g.text).join(" ");
  const latinSearch = normalizeLatin(latinParts) ?? undefined;
  return {
    ...candidate,
    normalized: {
      arabic,
      arabicSearch,
      latinSearch,
    },
    fingerprint: fingerprintArabic(arabic),
  };
}

/**
 * Deduplicate within a batch, then optionally match against existing corpus.
 * Exact fingerprint merge unions sources + glosses. Near-dups are flagged only.
 */
export function dedupeCandidates(
  input: StagingCandidate[],
  options: DedupeOptions = {},
): StagingCandidate[] {
  const threshold = options.nearDuplicateThreshold ?? DEFAULT_NEAR_THRESHOLD;
  const enriched = input.map(enrichCandidate);

  const byFp = new Map<string, StagingCandidate>();
  const noFp: StagingCandidate[] = [];

  for (const cand of enriched) {
    if (!cand.fingerprint) {
      noFp.push({ ...cand, match: { ...cand.match, status: "NEW" } });
      continue;
    }
    const existing = byFp.get(cand.fingerprint);
    if (!existing) {
      byFp.set(cand.fingerprint, {
        ...cand,
        match: { ...cand.match, status: "NEW" },
      });
      continue;
    }
    const merged: StagingCandidate = {
      ...existing,
      glosses: mergeGlosses(existing.glosses, cand.glosses),
      tags: [...new Set([...existing.tags, ...cand.tags])],
      sources: mergeSources(existing.sources, cand.sources),
      original: {
        arabic: existing.original.arabic ?? cand.original.arabic,
        fields: { ...cand.original.fields, ...existing.original.fields },
      },
      match: {
        status: existing.match.status === "MATCH_EXISTING"
          ? "MATCH_EXISTING"
          : "NEW",
        existingId: existing.match.existingId,
        relatedStagingIds: [
          ...(existing.match.relatedStagingIds ?? []),
          cand.stagingId,
        ],
      },
    };
    // Track absorbed duplicate for reporting via relatedStagingIds length
    byFp.set(cand.fingerprint, {
      ...merged,
      match: {
        ...merged.match,
        // Prefer NEW on survivor; EXACT_DUPLICATE reserved for absorbed-only rows if emitted later
      },
    });
  }

  let results = [...byFp.values(), ...noFp];

  // Near-duplicate pass among NEW items (conservative, no auto-merge)
  for (let i = 0; i < results.length; i += 1) {
    const a = results[i];
    if (!a.fingerprint || a.match.status !== "NEW") continue;
    const aNorm = a.normalized?.arabicSearch ?? "";
    for (let j = i + 1; j < results.length; j += 1) {
      const b = results[j];
      if (!b.fingerprint || b.match.status !== "NEW") continue;
      if (a.fingerprint === b.fingerprint) continue;
      const bNorm = b.normalized?.arabicSearch ?? "";
      const score = trigramSimilarity(aNorm, bNorm);
      if (score >= threshold && score < 1) {
        results[j] = {
          ...b,
          match: {
            status: "POSSIBLE_DUPLICATE",
            relatedStagingIds: [a.stagingId],
            score,
          },
        };
      }
    }
  }

  if (options.existing) {
    results = results.map((cand) => {
      if (!cand.fingerprint) return cand;
      const hit = options.existing!.byFingerprint.get(cand.fingerprint);
      if (!hit) return cand;
      if (cand.match.status === "EXACT_DUPLICATE") {
        return {
          ...cand,
          match: {
            ...cand.match,
            status: "MATCH_EXISTING",
            existingId: hit.id,
          },
        };
      }
      if (cand.match.status === "NEW") {
        return {
          ...cand,
          match: {
            status: "MATCH_EXISTING",
            existingId: hit.id,
          },
        };
      }
      return cand;
    });
  }

  return results;
}

export function loadExistingIndex(
  entries: ExistingCorpusEntry[],
): ExistingCorpusIndex {
  const byFingerprint = new Map<string, ExistingCorpusEntry>();
  for (const entry of entries) {
    byFingerprint.set(entry.fingerprint, entry);
  }
  return { byFingerprint };
}
