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

  it("emits one draft when ≥2 independent pairs share the transform", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
      { id: "3", arabic: "خبر", root: null, gloss: "news" },
      { id: "4", arabic: "خبّر", root: null, gloss: "inform" },
      { id: "5", arabic: "صلح", root: null, gloss: "be right" },
      { id: "6", arabic: "صلّح", root: null, gloss: "fix" },
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].payload.pairs).toHaveLength(3);
    expect(drafts[0].signals.pair_count).toBe(3);
    expect(drafts[0].detector_version).toBe("2");
  });

  it("emits no draft for a single pair", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
    ]);
    expect(drafts).toHaveLength(0);
    expect(findMiddleDoublingPairs([
      { id: "1", arabic: "علم", root: "ع ل م", gloss: "know" },
      { id: "2", arabic: "علّم", root: "ع ل م", gloss: "teach" },
    ])).toHaveLength(1);
  });

  it("emits no draft for Form II orphans without Form I bases", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علّم", root: null, gloss: "teach" },
      { id: "2", arabic: "صلّح", root: null, gloss: "fix" },
      { id: "3", arabic: "خبّر", root: null, gloss: "inform" },
    ]);
    expect(drafts).toHaveLength(0);
    expect(findMiddleDoublingPairs([
      { id: "1", arabic: "علّم", root: null, gloss: "teach" },
      { id: "2", arabic: "صلّح", root: null, gloss: "fix" },
      { id: "3", arabic: "خبّر", root: null, gloss: "inform" },
    ])).toHaveLength(0);
  });

  it("rejects أوّل جوّا برّا as Form II pair candidates", () => {
    const pairs = findMiddleDoublingPairs([
      { id: "1", arabic: "اول", root: null, gloss: "first?" },
      { id: "2", arabic: "أوّل", root: null, gloss: "first" },
      { id: "3", arabic: "جوا", root: null, gloss: "inside?" },
      { id: "4", arabic: "جوّا", root: null, gloss: "inside" },
      { id: "5", arabic: "برا", root: null, gloss: "outside?" },
      { id: "6", arabic: "برّا", root: null, gloss: "outside" },
    ]);
    expect(pairs).toHaveLength(0);
    expect(
      discoverMiddleDoublingDrafts([
        { id: "1", arabic: "اول", root: null, gloss: "first?" },
        { id: "2", arabic: "أوّل", root: null, gloss: "first" },
        { id: "3", arabic: "جوا", root: null, gloss: "inside?" },
        { id: "4", arabic: "جوّا", root: null, gloss: "inside" },
        { id: "5", arabic: "برا", root: null, gloss: "outside?" },
        { id: "6", arabic: "برّا", root: null, gloss: "outside" },
      ]),
    ).toHaveLength(0);
  });

  it("needs ≥2 pairs even when orphans are present", () => {
    const drafts = discoverMiddleDoublingDrafts([
      { id: "1", arabic: "علم", root: null, gloss: "know" },
      { id: "2", arabic: "علّم", root: null, gloss: "teach" },
      { id: "3", arabic: "صلّح", root: null, gloss: "fix" },
      { id: "4", arabic: "خبّر", root: null, gloss: "inform" },
    ]);
    expect(drafts).toHaveLength(0);
  });

  it("ignores unrelated same-length words", () => {
    const pairs = findMiddleDoublingPairs([
      { id: "1", arabic: "كتاب", root: null, gloss: "book" },
      { id: "2", arabic: "مدرسة", root: null, gloss: "school" },
    ]);
    expect(pairs).toHaveLength(0);
  });
});
