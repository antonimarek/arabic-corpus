import { describe, expect, it } from "vitest";

import { relativeAge } from "@/lib/relative-age";

const now = new Date("2026-08-14T12:00:00Z");

function ago(iso: string): string {
  return relativeAge(iso, now);
}

describe("relativeAge", () => {
  it("returns today for the same calendar day window", () => {
    expect(ago("2026-08-14T11:00:00Z")).toBe("today");
    expect(ago("2026-08-13T12:00:01Z")).toBe("today");
  });

  it("uses day buckets under a week", () => {
    expect(ago("2026-08-13T12:00:00Z")).toBe("1d");
    expect(ago("2026-08-11T12:00:00Z")).toBe("3d");
    expect(ago("2026-08-08T12:00:00Z")).toBe("6d");
  });

  it("uses week buckets under a month", () => {
    expect(ago("2026-08-07T12:00:00Z")).toBe("1w");
    expect(ago("2026-07-31T12:00:00Z")).toBe("2w");
    expect(ago("2026-07-16T12:00:00Z")).toBe("4w");
  });

  it("uses month then year buckets", () => {
    expect(ago("2026-07-15T12:00:00Z")).toBe("1mo");
    expect(ago("2026-05-14T12:00:00Z")).toBe("3mo");
    expect(ago("2025-08-14T12:00:00Z")).toBe("1y");
    expect(ago("2024-08-14T12:00:00Z")).toBe("2y");
  });

  it("treats future timestamps as today", () => {
    expect(ago("2026-08-15T00:00:00Z")).toBe("today");
  });

  it("returns empty for invalid dates", () => {
    expect(relativeAge("not-a-date", now)).toBe("");
  });
});
