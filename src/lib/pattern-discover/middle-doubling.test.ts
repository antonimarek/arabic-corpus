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

  it("clusters Form II orphans when Form I bases are missing", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علّم", root: null, gloss: "teach" },
      { id: "2", arabic: "جهّز", root: null, gloss: "prepare" },
      { id: "3", arabic: "كتب", root: null, gloss: "write" },
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].payload.pairs).toHaveLength(0);
    expect(drafts[0].payload.member_ids.sort()).toEqual(["1", "2"]);
    expect(drafts[0].confidence).toBe("medium");
    expect(drafts[0].signals.orphan_count).toBe(2);
  });

  it("keeps paired drafts and excludes those ids from orphan cluster", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
      { id: "3", arabic: "جهّز", root: null, gloss: "prepare" },
      { id: "4", arabic: "حضّر", root: null, gloss: "prepare" },
    ]);
    const paired = drafts.filter((d) => d.payload.pairs.length > 0);
    const orphans = drafts.filter((d) => (d.signals.orphan_count ?? 0) > 0);
    expect(paired).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].payload.member_ids.sort()).toEqual(["3", "4"]);
    expect(orphans[0].payload.member_ids).not.toContain("2");
  });
});
