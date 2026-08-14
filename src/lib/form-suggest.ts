import { posKind } from "@/lib/citation";
import { matchKeysForNormalized, phraseMatchKey } from "@/lib/match-arabic";

export type FormHost = {
  id: string;
  arabic: string;
  root: string | null;
  part_of_speech: string | null;
  gloss?: string;
};

function dropLeadingAlef(normalized: string): string | null {
  if (!normalized.startsWith("ا") || normalized.length < 3) return null;
  return normalized.slice(1);
}

function bestStemScore(stems: string[], candidate: string): number {
  let best = 0;
  for (const stem of stems) {
    if (stem === candidate) return 100;
    if (candidate.length >= 2 && stem.startsWith(candidate)) {
      best = Math.max(best, 80);
    }
    if (stem.length >= 2 && candidate.startsWith(stem)) {
      best = Math.max(best, 80);
    }
    const dropped = dropLeadingAlef(candidate);
    if (dropped && dropped.length >= 2 && stem.startsWith(dropped)) {
      best = Math.max(best, 90);
    }
    if (dropped && dropped.length >= 2 && dropped.startsWith(stem)) {
      best = Math.max(best, 90);
    }
  }
  return best;
}

export function formHostScore(surface: string, host: FormHost): number {
  const surfaceKey = phraseMatchKey(surface);
  if (!surfaceKey) return 0;
  const stems = matchKeysForNormalized(surfaceKey);
  const rootKey = phraseMatchKey(host.root ?? "");
  const headKey = phraseMatchKey(host.arabic);
  const rootScore = rootKey ? bestStemScore(stems, rootKey) : 0;
  const headScore = headKey ? bestStemScore(stems, headKey) : 0;
  let score = Math.max(rootScore, headScore);
  if (score === 0) return 0;
  if (posKind(host.part_of_speech) === "verb") score += 5;
  return score;
}

export function rankFormHosts(surface: string, hosts: FormHost[]): FormHost[] {
  return [...hosts].sort((left, right) => {
    const scoreDelta =
      formHostScore(surface, right) - formHostScore(surface, left);
    if (scoreDelta !== 0) return scoreDelta;
    return left.arabic.localeCompare(right.arabic, "ar");
  });
}

export function suggestedFormHosts(
  surface: string,
  hosts: FormHost[],
  limit = 5,
): FormHost[] {
  return rankFormHosts(surface, hosts)
    .filter((host) => formHostScore(surface, host) > 0)
    .slice(0, limit);
}

export function formHostHint(surface: string, host: FormHost): string | null {
  const score = formHostScore(surface, host);
  if (score >= 90) return "Likely same root (alef may drop)";
  if (score >= 80) return "Same root";
  return null;
}
