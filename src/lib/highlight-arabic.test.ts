import { describe, expect, it } from "vitest";

import { findMatches } from "@/lib/highlight-arabic";
import {
  lookupKeysForSurface,
  peelClitic,
  phraseMatchKey,
  tokenizeArabic,
} from "@/lib/match-arabic";

describe("peelClitic", () => {
  it("peels a Levantine b- prefix", () => {
    expect(peelClitic(phraseMatchKey("بكتب")!)).toBe(phraseMatchKey("كتب"));
  });

  it("peels al-", () => {
    expect(peelClitic(phraseMatchKey("البيت")!)).toBe(phraseMatchKey("بيت"));
  });

  it("peels one layer only", () => {
    expect(peelClitic(phraseMatchKey("بالبيت")!)).toBe(phraseMatchKey("البيت"));
  });

  it("does not peel short remainders", () => {
    expect(peelClitic("بك")).toBeNull();
  });
});

describe("tokenizeArabic", () => {
  it("splits on whitespace and Arabic punctuation", () => {
    const tokens = tokenizeArabic("مرحبا، كيفك؟");
    expect(tokens.map((token) => token.surface)).toEqual(["مرحبا", "كيفك"]);
  });
});

describe("lookupKeysForSurface", () => {
  it("includes exact and peeled keys", () => {
    const keys = lookupKeysForSurface("بكتب");
    expect(keys).toContain(phraseMatchKey("بكتب"));
    expect(keys).toContain(phraseMatchKey("كتب"));
  });
});

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

  it("matches after tashkeel strip", () => {
    const matches = findMatches("مَرْحَبًا", [
      { phrase: "مرحبا", href: "/vocabulary/1", kind: "vocabulary" },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.surface).toBe("مَرْحَبًا");
  });

  it("matches a clitic-prefixed token to the lemma", () => {
    const matches = findMatches("عم بكتب", [
      { phrase: "كتب", href: "/vocabulary/1", kind: "vocabulary" },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.surface).toBe("بكتب");
  });

  it("does not match a lemma inside a longer unrelated token", () => {
    const matches = findMatches("المكتب", [
      { phrase: "كتب", href: "/vocabulary/1", kind: "vocabulary" },
    ]);
    expect(matches).toHaveLength(0);
  });

  it("matches a stored surface form", () => {
    const matches = findMatches("بكتبوا", [
      {
        phrase: "كتب",
        href: "/vocabulary/1",
        kind: "vocabulary",
        matchKeys: [phraseMatchKey("كتب")!, phraseMatchKey("بكتبوا")!],
      },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.surface).toBe("بكتبوا");
  });

  it("prefers focus over known when the span is the same", () => {
    const matches = findMatches("كتب", [
      { phrase: "كتب", href: "/vocabulary/known", kind: "known" },
      { phrase: "كتب", href: "/vocabulary/focus", kind: "vocabulary" },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.link.href).toBe("/vocabulary/focus");
  });
});
