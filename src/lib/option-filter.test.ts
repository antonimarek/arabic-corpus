import { describe, expect, it } from "vitest";

import { optionMatchesQuery, rootsMatch } from "@/lib/option-filter";

describe("optionMatchesQuery", () => {
  it("matches latin case-insensitively", () => {
    expect(
      optionMatchesQuery({ label: "عم + participle", hint: "3am" }, "3AM"),
    ).toBe(true);
  });

  it("matches Arabic ignoring tashkeel and alef variants", () => {
    expect(
      optionMatchesQuery({ label: "مَرْحَبًا", hint: "hello" }, "مرحبا"),
    ).toBe(true);
    expect(optionMatchesQuery({ label: "أحمد" }, "احمد")).toBe(true);
  });

  it("rejects unrelated queries", () => {
    expect(optionMatchesQuery({ label: "كتب" }, "كتاب")).toBe(false);
  });
});

describe("rootsMatch", () => {
  it("treats tashkeel and alef variants as the same root", () => {
    expect(rootsMatch("كَتَب", "كتب")).toBe(true);
    expect(rootsMatch("أكل", "اكل")).toBe(true);
  });

  it("rejects empty or different roots", () => {
    expect(rootsMatch(null, "كتب")).toBe(false);
    expect(rootsMatch("كتب", "قرأ")).toBe(false);
  });
});
