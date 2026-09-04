import { turnTextSimilarity } from "./align";
import type { FathomSegment } from "./fathom-parse";
import { normalizeSpeaker } from "./fathom-parse";
import type { WisprTurn } from "./wispr-parse";

export type TimedFathomSegment = FathomSegment & { endSeconds: number };

export type WisprMappedSegment = TimedFathomSegment & {
  wisprText: string;
  wisprScore: number;
};

/**
 * Map Wispr turns onto timed Fathom segments.
 *
 * Roles/timestamps stay on Fathom (Moayad≈Speaker 2 tutor, Antoni≈student).
 * Wispr only supplies wording. Uses DP sequence alignment with speaker bonus.
 */
export function mapWisprTextOntoFathomSegments(params: {
  fathomSegments: TimedFathomSegment[];
  wisprTurns: WisprTurn[];
  tutorNames?: string[];
}): WisprMappedSegment[] {
  const tutorNames = params.tutorNames ?? ["Speaker 2"];
  const fathom = params.fathomSegments;
  const wispr = params.wisprTurns;

  if (fathom.length === 0) return [];
  if (wispr.length === 0) {
    return fathom.map((segment) => ({
      ...segment,
      wisprText: "",
      wisprScore: 0,
    }));
  }

  const n = fathom.length;
  const m = wispr.length;
  const gap = -0.35;

  const score = (i: number, j: number): number => {
    const segment = fathom[i];
    const turn = wispr[j];
    if (!segment || !turn) return gap;
    if (turn.role === "OTHER") return gap;

    const fathomRole = normalizeSpeaker(segment.speaker, tutorNames);
    const textScore = turnTextSimilarity(segment.text, turn.text);
    const roleBonus = fathomRole === turn.role ? 0.35 : -0.15;
    const arabicBonus =
      /[\u0600-\u06FF]/.test(turn.text) && !/[\u0600-\u06FF]/.test(segment.text)
        ? 0.1
        : 0;
    return textScore + roleBonus + arabicBonus;
  };

  // DP: max score aligning fathom[0..i) with wispr[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  const prev: Array<Array<"diag" | "up" | "left" | null>> = Array.from(
    { length: n + 1 },
    () => Array.from({ length: m + 1 }, () => null),
  );

  for (let i = 1; i <= n; i += 1) {
    dp[i]![0] = (dp[i - 1]![0] ?? 0) + gap;
    prev[i]![0] = "up";
  }
  for (let j = 1; j <= m; j += 1) {
    dp[0]![j] = (dp[0]![j - 1] ?? 0) + gap;
    prev[0]![j] = "left";
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const diag = (dp[i - 1]![j - 1] ?? 0) + score(i - 1, j - 1);
      const up = (dp[i - 1]![j] ?? 0) + gap;
      const left = (dp[i]![j - 1] ?? 0) + gap;
      if (diag >= up && diag >= left) {
        dp[i]![j] = diag;
        prev[i]![j] = "diag";
      } else if (up >= left) {
        dp[i]![j] = up;
        prev[i]![j] = "up";
      } else {
        dp[i]![j] = left;
        prev[i]![j] = "left";
      }
    }
  }

  const assigned: Array<{ texts: string[]; scores: number[] }> = Array.from(
    { length: n },
    () => ({ texts: [], scores: [] }),
  );

  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = prev[i]?.[j];
    if (step === "diag") {
      const segmentIndex = i - 1;
      const turn = wispr[j - 1];
      if (turn && turn.role !== "OTHER") {
        assigned[segmentIndex]?.texts.unshift(turn.text);
        assigned[segmentIndex]?.scores.unshift(score(segmentIndex, j - 1));
      }
      i -= 1;
      j -= 1;
    } else if (step === "up") {
      i -= 1;
    } else if (step === "left") {
      // Wispr turn with no Fathom home: attach to nearest previous mapped segment.
      const turn = wispr[j - 1];
      const target = Math.max(0, i - 1);
      if (turn && turn.role !== "OTHER") {
        assigned[target]?.texts.push(turn.text);
        assigned[target]?.scores.push(0.05);
      }
      j -= 1;
    } else {
      break;
    }
  }

  return fathom.map((segment, index) => {
    const bucket = assigned[index] ?? { texts: [], scores: [] };
    const wisprText = bucket.texts.join(" ").replace(/\s+/g, " ").trim();
    const wisprScore =
      bucket.scores.length === 0
        ? 0
        : bucket.scores.reduce((sum, value) => sum + value, 0) / bucket.scores.length;
    return {
      ...segment,
      wisprText,
      wisprScore,
    };
  });
}
