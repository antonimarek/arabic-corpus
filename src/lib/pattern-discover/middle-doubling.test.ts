import { describe, expect, it } from "vitest";

import {
  discoverMiddleDoublingDrafts,
  findMiddleDoublingPairs,
} from "@/lib/pattern-discover/middle-doubling";

describe("middle doubling detector", () => {
  it("finds علم → علّم style pairs", () => {
    const pairs = findMiddleDoublingPairs([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
      { id: "3", arabic: "كتب", root: "ك ت ب", gloss: "write" },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].base.id).toBe("1");
    expect(pairs[0].derived.id).toBe("2");
    expect(pairs[0].confidence).toBe("high");
    expect(pairs[0].signals.same_root).toBe(true);
  });

  it("clusters shared-family pairs into one draft", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
      { id: "3", arabic: "جهز", root: null, gloss: "prepare" },
      { id: "4", arabic: "جهّز", root: null, gloss: "prepare something" },
    ]);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    const fingerprints = new Set(drafts.map((d) => d.fingerprint));
    expect(fingerprints.size).toBe(drafts.length);
  });

  it("ignores unrelated same-length words", () => {
    const pairs = findMiddleDoublingPairs([
      { id: "1", arabic: "كتاب", root: null, gloss: "book" },
      { id: "2", arabic: "مدرسة", root: null, gloss: "school" },
    ]);
    expect(pairs).toHaveLength(0);
  });
});
