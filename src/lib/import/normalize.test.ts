import { describe, expect, it } from "vitest";

import { normalizeArabic, normalizeLatin } from "@/lib/import/normalize";

describe("normalizeArabic", () => {
  it("returns null for nullish", () => {
    expect(normalizeArabic(null)).toBeNull();
    expect(normalizeArabic(undefined)).toBeNull();
  });

  it("strips diacritics", () => {
    expect(normalizeArabic("مَرْحَبًا")).toBe(normalizeArabic("مرحبا"));
  });

  it("maps alef variants and taa marbuta and alif maqsura", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("إبراهيم")).toBe("ابراهيم");
    expect(normalizeArabic("آمن")).toBe("امن");
    expect(normalizeArabic("مدرسة")).toBe("مدرسه");
    expect(normalizeArabic("على")).toBe("علي");
  });

  it("lowercases", () => {
    expect(normalizeArabic("ABC")).toBe("abc");
  });

  it("preserves punctuation differences in identity sense for callers", () => {
    // normalize does not strip ؟ — fingerprinting uses full normalized string
    expect(normalizeArabic("شو عم تعمل؟")).not.toBe(
      normalizeArabic("شو عم تعمل"),
    );
  });
});

describe("normalizeLatin", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeLatin("  What   ARE  you  ")).toBe("what are you");
  });

  it("returns null for nullish", () => {
    expect(normalizeLatin(null)).toBeNull();
  });
});
