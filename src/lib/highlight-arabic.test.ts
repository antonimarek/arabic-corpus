import { describe, expect, it } from "vitest";

import { findMatches } from "@/lib/highlight-arabic";

describe("findMatches", () => {
  it("prefers the longer phrase and skips overlap", () => {
    const matches = findMatches("عم بكتب", [
      { phrase: "بكتب", href: "/vocabulary/1", kind: "vocabulary" },
      { phrase: "عم بكتب", href: "/structures/1", kind: "structure" },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.link.href).toBe("/structures/1");
    expect(matches[0]?.start).toBe(0);
  });

  it("finds non-overlapping phrases", () => {
    const matches = findMatches("بدي اكل", [
      { phrase: "بدي", href: "/vocabulary/1", kind: "vocabulary" },
      { phrase: "اكل", href: "/vocabulary/2", kind: "vocabulary" },
    ]);
    expect(matches.map((match) => match.link.href)).toEqual([
      "/vocabulary/1",
      "/vocabulary/2",
    ]);
  });
});
