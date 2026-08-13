import { describe, expect, it } from "vitest";

import { firstGloss } from "@/lib/arabic-links";
import { hitsShareSearchKey, phraseSearchKey } from "@/lib/lookup-phrase";

describe("phraseSearchKey", () => {
  it("returns null for blank input", () => {
    expect(phraseSearchKey("  ")).toBeNull();
  });

  it("treats alef variants as the same key", () => {
    expect(phraseSearchKey("أحمد")).toBe(phraseSearchKey("احمد"));
    expect(phraseSearchKey("إبراهيم")).toBe(phraseSearchKey("ابراهيم"));
  });

  it("strips tashkeel", () => {
    expect(hitsShareSearchKey("مَرْحَبًا", "مرحبا")).toBe(true);
  });

  it("maps taa marbuta and alif maqsura", () => {
    expect(hitsShareSearchKey("مدرسة", "مدرسه")).toBe(true);
    expect(hitsShareSearchKey("على", "علي")).toBe(true);
  });

  it("does not match different words", () => {
    expect(hitsShareSearchKey("كتب", "كتاب")).toBe(false);
  });
});

describe("firstGloss", () => {
  it("returns the earliest sense", () => {
    expect(
      firstGloss([
        { gloss: "later", created_at: "2026-08-02T00:00:00Z" },
        { gloss: "first", created_at: "2026-08-01T00:00:00Z" },
      ]),
    ).toBe("first");
  });
});
