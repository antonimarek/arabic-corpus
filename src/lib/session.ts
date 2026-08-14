export const SESSION_BUDGETS = [5, 15, 30] as const;
export type SessionBudget = (typeof SESSION_BUDGETS)[number];
export type SessionStep = "listen" | "read" | "retrieve" | "fluency";

export type SessionTextCandidate = {
  id: string;
  title: string;
  hasAudio: boolean;
  focusCount: number;
  dueExampleCount: number;
};

export type RankSessionInput = {
  texts: SessionTextCandidate[];
  lastTextId: string | null;
  lastUnfinished: boolean;
};

export type RankSessionResult =
  | { ok: false; reason: "no-audio" }
  | { ok: true; text: SessionTextCandidate; reason: string };

export function parseSessionBudget(raw: string | null | undefined): SessionBudget {
  const n = Number(raw);
  if (n === 5 || n === 15 || n === 30) return n;
  return 15;
}

export function rankSession(input: RankSessionInput): RankSessionResult {
  const withAudio = input.texts.filter((text) => text.hasAudio);
  if (withAudio.length === 0) {
    return { ok: false, reason: "no-audio" };
  }

  const byId = new Map(withAudio.map((text) => [text.id, text]));
  if (input.lastUnfinished && input.lastTextId) {
    const unfinished = byId.get(input.lastTextId);
    if (unfinished) {
      return { ok: true, text: unfinished, reason: "Unfinished listen" };
    }
  }

  const withDue = withAudio.find((text) => text.dueExampleCount > 0);
  if (withDue) {
    const n = withDue.dueExampleCount;
    return {
      ok: true,
      text: withDue,
      reason:
        n === 1
          ? "1 due line from this dialogue"
          : `${n} due lines from this dialogue`,
    };
  }

  const withFocus = withAudio.find(
    (text) => text.focusCount >= 1 && text.focusCount <= 3,
  );
  if (withFocus) {
    const n = withFocus.focusCount;
    return {
      ok: true,
      text: withFocus,
      reason: n === 1 ? "1 new focus word" : `${n} new focus words`,
    };
  }

  return {
    ok: true,
    text: withAudio[0],
    reason: "Listen to this text",
  };
}

export function stepsForBudget(
  budget: SessionBudget,
  dueCount: number,
): SessionStep[] {
  if (budget === 5) {
    return dueCount > 0 ? ["retrieve"] : ["listen"];
  }
  if (budget === 15) {
    return ["listen", "read", "retrieve"];
  }
  return ["listen", "read", "retrieve", "fluency"];
}

export function nextStep(
  steps: SessionStep[],
  current: SessionStep,
): SessionStep | "done" {
  const index = steps.indexOf(current);
  if (index < 0) return steps[0] ?? "done";
  return steps[index + 1] ?? "done";
}
