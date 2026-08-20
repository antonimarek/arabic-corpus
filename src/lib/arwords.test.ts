import { describe, expect, it } from "vitest";

import { arwordsSearchUrl } from "@/lib/arwords";

describe("arwordsSearchUrl", () => {
  it("builds the public search results path", () => {
    expect(arwordsSearchUrl("آسف")).toBe(
      "https://www.arwords.com/words/search/%D8%A2%D8%B3%D9%81",
    );
  });

  it("falls back to the words index for blank input", () => {
    expect(arwordsSearchUrl("  ")).toBe("https://www.arwords.com/words");
  });
});
