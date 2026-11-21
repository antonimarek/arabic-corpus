import { describe, expect, it } from "vitest";

import {
  DAILY_DUE_CAP,
  newSlotsLeft,
  orderDue,
  pickTodayDue,
  spreadBacklog,
  streakDays,
  type DueStub,
} from "@/lib/review";

const card = (id: string, due: string, state = 2): DueStub => ({ id, due, state });

function pile(n: number): DueStub[] {
  return Array.from({ length: n }, (_, i) =>
    card(`c${i}`, new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString()),
  );
}

describe("daily due queue", () => {
  it("puts learning and relearning cards first, then most overdue", () => {
    const ordered = orderDue([
      card("review-old", "2026-11-01T00:00:00.000Z", 2),
      card("relearn", "2026-11-20T00:00:00.000Z", 3),
      card("review-older", "2026-10-01T00:00:00.000Z", 2),
      card("learn", "2026-11-21T00:00:00.000Z", 1),
    ]);
    expect(ordered.map((c) => c.id)).toEqual([
      "relearn",
      "learn",
      "review-older",
      "review-old",
    ]);
  });

  it("caps today at the daily due cap", () => {
    expect(pickTodayDue(pile(40), 0)).toHaveLength(DAILY_DUE_CAP);
  });

  it("shrinks today's room by what was already reviewed", () => {
    expect(pickTodayDue(pile(40), 10)).toHaveLength(DAILY_DUE_CAP - 10);
    expect(pickTodayDue(pile(40), 99)).toHaveLength(0);
  });

  it("returns everything when under the cap", () => {
    expect(pickTodayDue(pile(3), 0)).toHaveLength(3);
  });
});

describe("backlog spreading after a break", () => {
  it("spreads a 100-card pile over 7 days at 15 per day", () => {
    const days = spreadBacklog(pile(100));
    expect(days.map((d) => d.length)).toEqual([15, 15, 15, 15, 15, 15, 10]);
  });

  it("never loses or duplicates a card", () => {
    const days = spreadBacklog(pile(53), { reviewedToday: 4 });
    const ids = days.flat().map((c) => c.id);
    expect(new Set(ids).size).toBe(53);
    expect(days[0]).toHaveLength(11);
  });

  it("keeps the most overdue cards in the earliest days", () => {
    const days = spreadBacklog(pile(30));
    expect(days[0][0].id).toBe("c0");
    expect(days[1][0].id).toBe("c15");
  });

  it("handles an empty pile", () => {
    expect(spreadBacklog([])).toEqual([[]]);
  });
});

describe("new card slots", () => {
  it("allows up to 5 and never goes negative", () => {
    expect(newSlotsLeft(0)).toBe(5);
    expect(newSlotsLeft(3)).toBe(2);
    expect(newSlotsLeft(9)).toBe(0);
  });
});

describe("streak", () => {
  const now = new Date("2026-11-21T09:00:00.000Z");

  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-11-21", "2026-11-20", "2026-11-19"], now)).toBe(3);
  });

  it("does not break before today's session is done", () => {
    expect(streakDays(["2026-11-20", "2026-11-19"], now)).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(streakDays(["2026-11-21", "2026-11-19"], now)).toBe(1);
    expect(streakDays(["2026-11-18"], now)).toBe(0);
  });

  it("ignores duplicate days", () => {
    expect(streakDays(["2026-11-21", "2026-11-21"], now)).toBe(1);
  });
});
