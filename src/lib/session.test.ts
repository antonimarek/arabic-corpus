import { describe, expect, it } from "vitest";

import {
  nextStep,
  rankSession,
  stepsForBudget,
  type SessionTextCandidate,
} from "@/lib/session";

const audio = (
  id: string,
  extra: Partial<SessionTextCandidate> = {},
): SessionTextCandidate => ({
  id,
  title: id,
  hasAudio: true,
  focusCount: 0,
  dueExampleCount: 0,
  ...extra,
});

describe("rankSession", () => {
  it("returns no-audio when no text can play", () => {
    const result = rankSession({
      texts: [{ ...audio("silent"), hasAudio: false }],
      lastTextId: "silent",
      lastUnfinished: true,
    });
    expect(result).toEqual({ ok: false, reason: "no-audio" });
  });

  it("picks an unfinished last text before due items", () => {
    const result = rankSession({
      texts: [
        audio("due", { dueExampleCount: 4 }),
        audio("open"),
      ],
      lastTextId: "open",
      lastUnfinished: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.id).toBe("open");
      expect(result.reason).toBe("Unfinished listen");
    }
  });

  it("picks a text with due examples next", () => {
    const result = rankSession({
      texts: [
        audio("focus", { focusCount: 2 }),
        audio("due", { dueExampleCount: 3 }),
      ],
      lastTextId: null,
      lastUnfinished: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.id).toBe("due");
      expect(result.reason).toBe("3 due lines from this dialogue");
    }
  });

  it("picks unused focus of 1 to 3 words when nothing is due", () => {
    const result = rankSession({
      texts: [
        audio("wide", { focusCount: 8 }),
        audio("focus", { focusCount: 2 }),
      ],
      lastTextId: null,
      lastUnfinished: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.id).toBe("focus");
      expect(result.reason).toBe("2 new focus words");
    }
  });

  it("falls back to any audio text", () => {
    const result = rankSession({
      texts: [audio("only")],
      lastTextId: null,
      lastUnfinished: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.id).toBe("only");
      expect(result.reason).toBe("Listen to this text");
    }
  });
});

describe("session steps", () => {
  it("uses retrieve only for a 5-minute budget when cards are due", () => {
    expect(stepsForBudget(5, 2)).toEqual(["retrieve"]);
  });

  it("listens when a 5-minute budget has an empty due queue", () => {
    expect(stepsForBudget(5, 0)).toEqual(["listen"]);
  });

  it("walks listen, read, retrieve for 15 minutes", () => {
    const steps = stepsForBudget(15, 1);
    expect(steps).toEqual(["listen", "read", "retrieve"]);
    expect(nextStep(steps, "retrieve")).toBe("done");
  });

  it("adds fluency after retrieve for 30 minutes", () => {
    expect(stepsForBudget(30, 0)).toEqual([
      "listen",
      "read",
      "retrieve",
      "fluency",
    ]);
  });
});
