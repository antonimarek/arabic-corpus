import { describe, expect, it } from "vitest";

import {
  reuseTodayPrefs,
  SERVER_TODAY_PREFS,
  type TodayPrefs,
} from "@/lib/session-prefs";

const other: TodayPrefs = {
  budget: 5,
  lastTextId: "text-1",
  unfinished: true,
  finishedId: "text-2",
};

describe("reuseTodayPrefs", () => {
  it("returns the previous object when values match", () => {
    const next: TodayPrefs = { ...SERVER_TODAY_PREFS };
    expect(reuseTodayPrefs(SERVER_TODAY_PREFS, next)).toBe(SERVER_TODAY_PREFS);
  });

  it("returns the next object when a field changes", () => {
    expect(reuseTodayPrefs(SERVER_TODAY_PREFS, other)).toBe(other);
  });
});
