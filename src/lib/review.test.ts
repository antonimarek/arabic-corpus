import { describe, expect, it } from "vitest";

import {
  DAILY_NEW_CAP,
  enrollDueAt,
  gradeStoredCard,
  newStoredCard,
} from "@/lib/review";

describe("review scheduling", () => {
  it("enrolls under the daily cap as due now", () => {
    const now = new Date("2026-08-14T11:00:00.000Z");
    expect(enrollDueAt(now, DAILY_NEW_CAP - 1).toISOString()).toBe(
      now.toISOString(),
    );
  });

  it("pushes overflow new cards to the next UTC day", () => {
    const now = new Date("2026-08-14T11:00:00.000Z");
    expect(enrollDueAt(now, DAILY_NEW_CAP).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z",
    );
  });

  it("moves due later after a Good grade", () => {
    const now = new Date("2026-08-14T11:00:00.000Z");
    const fresh = newStoredCard(now);
    const graded = gradeStoredCard(fresh, "good", now);
    expect(new Date(graded.due).getTime()).toBeGreaterThan(now.getTime());
    expect(graded.reps).toBe(1);
  });
});
