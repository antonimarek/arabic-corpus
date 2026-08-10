import { describe, expect, it } from "vitest";

import {
  lineAnchorId,
  parseLineHash,
  splitTextLines,
} from "@/lib/text-lines";

describe("text lines", () => {
  it("preserves empty lines for stable numbering", () => {
    expect(splitTextLines("a\n\nb")).toEqual(["a", "", "b"]);
  });

  it("parses line hash", () => {
    expect(lineAnchorId(12)).toBe("line-12");
    expect(parseLineHash("#line-12")).toBe(12);
    expect(parseLineHash("line-3")).toBe(3);
    expect(parseLineHash("#nope")).toBeNull();
  });
});
